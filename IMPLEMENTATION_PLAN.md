# Google Forms Auto Filler — Implementation Plan

Comprehensive, decision-complete plan for the 9 investigation findings, grouped into
4 buckets. Every open design question has been resolved up front (see **Locked
Decisions**). This document is the single source of truth for the work; implement
straight from it.

> Project Hub: project **80** (`Technical-1/GoogleFormsAutoFiller`). All 9 tasks synced.

---

## Locked Decisions

| Question | Decision | Consequence |
|---|---|---|
| Date locale | **Add a user-configurable locale setting (DMY/MDY, default DMY, with Auto)** | New popup `<select>`, new settings storage key, date handler reads it |
| Storage backend | **Switch to `chrome.storage.local`** | All `storage.sync` calls migrate; one-time data migration; quota risk removed |
| `background.js` | **Implement save-on-close** | Popup opens a port, streams data to the service worker, worker flushes on disconnect |
| CSV duplicate | **Extract a shared module** | New `scripts/csvParser.js`; delete `scripts/csvImporter.js`; popup + content share modules |

---

## Architecture After This Work

New/changed module layout (no bundler — plain scripts sharing scope, MV3-friendly):

```
scripts/
  storage.js      NEW  shared storage helper (wraps chrome.storage.local + keys + migration)
  csvParser.js    NEW  shared CSV parser (state-machine, quote/newline safe)
  GoogleForm.js   EDIT content script: Handlers, matching, fill, observer
  csvImporter.js  DELETE (dead duplicate)
popup/
  menu.html       EDIT load storage.js + csvParser.js before menu.js; add date-format <select>
  menu.js         EDIT remove inline parser; use shared modules; port to background; settings UI
  styles.css      EDIT style the new settings control
background.js     EDIT real save-on-close via port
manifest.json     EDIT content_scripts.js = [scripts/storage.js, scripts/GoogleForm.js]
```

**Why scripts share scope instead of ES modules:** MV3 content scripts listed in
`content_scripts.js` are injected into the same isolated-world global scope in array
order, so `storage.js` functions are visible to `GoogleForm.js` with zero import
machinery. The popup uses ordinary `<script src>` tags (also shared global scope).
This matches the existing commented-out `// import { Handlers }` intent without the
`type="module"` + `web_accessible_resources` overhead.

---

## Cross-Bucket Dependency Order

The buckets are **not** independent anymore. Build in this order:

```
0. FOUNDATION  ── scripts/storage.js + storage.local migration   (blocks everything)
        │
        ├─► A. Fill Engine        (date setting + observer + NaN + perf)
        ├─► B. CSV Import          (shared csvParser.js + parser fix)
        ├─► C. Storage Reliability (error surfacing — folds into storage.js)
        └─► D. background.js + cleanup
```

**Foundation first** because the storage backend switch and the shared `storage.js`
helper are touched by A, B, C, and D. Doing them piecemeal would mean editing the same
call sites repeatedly. Bucket C effectively *becomes* part of the foundation (error
handling lives in the helper). Buckets A, B, D can then proceed in parallel.

---

## FOUNDATION — `scripts/storage.js` + migration (folds in Bucket C)

### Objective
One shared module owning: the storage backend (`local`), the canonical keys, async
get/set wrappers with **mandatory `lastError` checks**, and a one-time `sync → local`
migration. Eliminates the silent-failure finding (task: *chrome.storage.sync.set
failures are silent*) and the duplicated storage access across files.

### Keys (canonical)
```js
const STORAGE_KEYS = { formData: "formData", settings: "settings" };
const DEFAULT_SETTINGS = { dateFormat: "DMY" }; // "DMY" | "MDY" | "AUTO"
```

### API (`scripts/storage.js`, attached to global scope)
```js
// All callbacks receive (error, value). error is null on success.
function getFormData(cb)            // -> {} when absent
function setFormData(data, cb)      // cb(error)
function getSettings(cb)            // -> merged over DEFAULT_SETTINGS
function setSettings(partial, cb)   // merge + write
function migrateSyncToLocal(cb)     // one-time, idempotent
```

Every write wraps:
```js
chrome.storage.local.set({ [key]: value }, () => {
  const err = chrome.runtime.lastError || null;
  if (err) console.warn("storage write failed:", err.message);
  cb && cb(err);
});
```

### Migration (idempotent, runs once)
- On popup load **and** content-script load, call `migrateSyncToLocal`.
- Logic: read `local.formData`. If present/non-empty → done (flag check). Else read
  `sync.formData`; if present, `local.set({formData})` then set a `local._migrated=true`
  marker. Guard with the marker so it never clobbers newer local data.
- Edge: if both empty, just set the marker. If `sync` read errors, log and continue
  (local stays empty; user re-enters data).

### Answered questions
- **Permission impact?** None. `manifest.json` already declares `"storage"`, which
  covers `local`. No manifest permission change.
- **Cross-device sync lost?** Yes, accepted (decision). Note in `Changelog.md`.
- **What about `storage.sync` 8KB/item cap on large CSV?** Gone — `local` is ~5MB+ with
  no per-item cap. The size pre-flight is therefore **not** needed; drop it.
- **Error UX?** Helper returns the error; popup surfaces it via `showStatus(msg,false)`.
  Content script logs to console (no UI surface there).

### Acceptance
- Fresh install: empty `local`, popup works.
- Upgrade with existing `sync` data: data appears in popup after first open; `sync`
  untouched (left as-is, harmless); re-opening does not duplicate or revert.
- Forced write failure (mock `lastError`): popup shows an error, no silent loss.

---

## BUCKET A — Fill Engine (`scripts/GoogleForm.js`)

Four findings in one file & code path. Sub-order: **observer first** (changes fill
frequency), then NaN guard, date setting, perf cache.

### A1. Observer re-fill loop  *(high)*
**Problem:** `FillGoogleForms` writes `value` + dispatches `input`/`change`; Google
Forms re-renders → `childList` mutation → observer fires → fill again, unbounded.

**Plan:**
- Hoist the observer to module scope: `let formObserver = null;`
- Wrap the write phase so the observer is paused during programmatic writes:
  ```js
  function fillPass(formData, settings) {
    if (formObserver) formObserver.disconnect();
    try { /* existing OnDataFetch loop */ }
    finally { if (formObserver) reconnect(); }
  }
  ```
- **Debounce** observer-driven fills (coalesce mutation bursts):
  ```js
  let fillTimer = null;
  function scheduleFill() {
    clearTimeout(fillTimer);
    fillTimer = setTimeout(() => FillGoogleForms(), 120);
  }
  ```
  The observer calls `scheduleFill()`, not `FillGoogleForms()` directly.

**Answered questions:**
- *Won't disconnecting miss lazy-loaded fields?* No — we reconnect in `finally`, and
  legitimately new DOM (new sections) still fires `childList` after reconnect →
  debounced fill. Only the *self-induced* mutations during our own write are excluded.
- *Reconnect with same options?* Yes: `{childList:true, subtree:true}` on `form`.
- *Idempotency of refill?* Filling an already-correct field re-sets the same value;
  with the cache (A4) the match is O(1) and the write is cheap. Acceptable.
- *Race: debounce fires after navigation away?* `form` reference is module-scoped; if
  the form is gone the selectors return empty NodeLists — safe no-op.

### A2. NaN in `CalculateSimilarity`  *(medium)*
**Plan:** guard zero length before dividing:
```js
function CalculateSimilarity(a, b) {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 100; // two empty strings are identical
  return (1 - levenshteinDistance(a, b) / maxLength) * 100;
}
```
**Answered:** Empty form title vs. empty key → 100 would match; but `findBestMatch`
already trims, and an empty title field is meaningless, so also **skip empty titles**
in the fill loop (`if (!formTitle) return;`). Belt + suspenders.

### A3. Date locale setting  *(high — was the "duplicate regex" bug)*
**Plan:**
- Date handler `fill` gains a context param carrying `settings.dateFormat`:
  ```js
  date: { selector: "input[type='date']",
          fill: (el, answer, ctx) => { el.value = toISO(answer, ctx.dateFormat); ...dispatch } }
  ```
- New pure helper `toISO(answer, fmt)`:
  - If already `YYYY-MM-DD` → return as-is.
  - Match `^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$`. Let `(p1,p2,year)`.
    - `fmt === "DMY"` → day=p1, month=p2
    - `fmt === "MDY"` → month=p1, day=p2
    - `fmt === "AUTO"` → if `p1 > 12` assume DMY; else if `p2 > 12` assume MDY; else
      fall back to DMY (documented tie-break).
  - Zero-pad, return `YYYY-MM-DD`. On no match, return `answer` untouched (let the
    browser reject invalid input rather than corrupt it).
- `FillGoogleForms` now loads **both** `formData` and `settings`, passing settings into
  the per-handler `fill` via a `ctx` object. Only the date handler reads it; text/
  textarea ignore the extra arg.

**Answered questions:**
- *Default format?* `DMY` (preserves today's de-facto behavior; no silent change for
  existing users).
- *Where is the setting stored/edited?* `settings.dateFormat` in `storage.local`, edited
  by a popup `<select>` (see Bucket B / popup section).
- *What about MM/DD/YYYY ambiguity (e.g. 03/04/2026)?* Resolved by the explicit setting;
  only `AUTO` guesses, and its tie-break (DMY) is documented.
- *Dead branch?* The original unreachable `else if` is deleted — replaced entirely by
  `toISO`.

### A4. Levenshtein perf / caching  *(medium)*
**Plan (after A1, then re-measure):**
- Memoize best-match per title for a given `formData` identity:
  ```js
  let matchCache = new Map();      // title -> bestMatchKey|null
  let cacheStamp = null;           // identity token for current formData
  ```
- Compute `cacheStamp = JSON.stringify(Object.keys(formData).sort())` (keys only — the
  match depends on keys, not values). When stamp changes, clear `matchCache`.
- `getBestMatchCached(title, formData)` checks the map first.
- Levenshtein itself: keep the O(n·m) DP but optionally swap to two-row rolling arrays
  to cut allocation. Optional; the cache is the real win since titles repeat across
  re-renders.

**Answered questions:**
- *Cache invalidation?* On `formData` key-set change (stamp) and on settings change is
  irrelevant (settings don't affect matching). Storage `onChanged` listener clears the
  cache so popup edits reflect live.
- *Memory?* Bounded by distinct field titles on one form (tiny).
- *Is the cache even needed after A1?* Likely marginal on small forms — implement it but
  gate the rolling-array micro-opt behind "only if profiling shows hotspot." Cache stays
  (cheap, correct).

### Bucket A acceptance
- Real form with date (DMY and MDY settings), text, email, textarea, lazy-loaded
  section. Verify: correct dates per setting; no console spam / no runaway fills
  (add a temporary fill counter during dev); late sections fill once; editing values in
  the popup updates the form within ~1 fill cycle.

---

## BUCKET B — CSV Import (`scripts/csvParser.js`, popup)

### B1. Extract shared module  *(low — do before B2)*
**Plan:**
- Create `scripts/csvParser.js` exposing `parseCSV(text)` and `processCSVFile(file,
  overwrite, cb)` on global scope. `processCSVFile` now uses the shared `storage.js`
  helpers (`getFormData`/`setFormData`) instead of inline `chrome.storage.sync`.
- `popup/menu.html`: add `<script src="../scripts/storage.js">` and
  `<script src="../scripts/csvParser.js">` **before** `menu.js`.
- Remove the inline `parseCSV`/`processCSVFile` copies from `menu.js`.
- **Delete `scripts/csvImporter.js`.**

**Answered questions:**
- *Why not an ES module?* Same rationale as storage.js — shared-scope scripts avoid
  `type="module"` + CSP/`web_accessible_resources` complications in MV3 popups.
- *Does the content script need the parser?* No — CSV import is popup-only. The shared
  module is shared between popup scripts, and is *available* to content scripts if ever
  needed, satisfying the "extract shared module" decision without over-wiring.
- *Path correctness?* Popup lives in `popup/`, scripts in `scripts/` → `../scripts/...`.

### B2. Newline-in-quotes parser fix  *(medium)*
**Problem:** current `parseCSV` splits on `\r?\n` before honoring quotes, so a quoted
field containing a newline is torn across "lines."

**Plan — replace with a single-pass state machine** over the whole text:
- States: `inQuotes` boolean; accumulate `field`, push to `row` on unquoted comma, push
  `row` on unquoted newline.
- `""` inside a quoted field → literal `"`.
- Handle `\r\n`, `\r`, `\n` line endings.
- After parse: keep existing semantics — first two columns are `key,value`; rows with
  `<2` non-empty cells or empty key/value are skipped; later columns ignored.
- Trim key/value (preserve internal whitespace/newlines in value if quoted).

**Answered questions:**
- *Multiline values supported now?* Yes — a quoted value with embedded newlines imports
  intact (it can legitimately fill a `<textarea>`).
- *Malformed CSV (unterminated quote)?* At EOF with `inQuotes` still true, flush the
  field as-is and surface a non-fatal warning via the import result message
  (`success:true` but note "1 row may be malformed") rather than throwing.
- *Encoding/BOM?* Strip a leading UTF-8 BOM (`﻿`) before parsing.
- *Header row?* Not assumed — every row is key/value (matches current behavior). Document
  this in the popup's CSV help text.

### Bucket B acceptance
- Import CSVs covering: quoted commas, quoted newlines, escaped `""`, BOM, CRLF vs LF,
  trailing empty lines, a row with a missing value (skipped). Counts match; values with
  newlines visible in the popup rows.

---

## BUCKET C — Storage Reliability

**Folded into FOUNDATION.** Once all reads/writes go through `storage.js` with mandatory
`lastError` checks and the backend is `local`:
- Silent-failure finding resolved (helper logs + returns errors; popup surfaces them).
- Quota-exhaustion risk resolved by `local` (no 8KB/item cap).
- No separate work items remain beyond wiring call sites to surface the returned error
  (popup: `showStatus`; content: console).

**Answered:** *Do we still need a size pre-flight / quota warning?* No — moot under
`local`. *Do we need `unlimitedStorage` permission?* No — only required for >~5MB or
IndexedDB-scale; key/value form data is far smaller.

---

## BUCKET D — `background.js` save-on-close + cleanup

### D1. Implement save-on-close  *(was: no-op listener)*
**Design (port-streamed flush):**
- **Popup** (`menu.js`): on load, `const port = chrome.runtime.connect({name:"popupSession"});`
  On every `SaveData`, also `port.postMessage({ type:"formData", data })`. Wrap in
  `try/catch` (port may be closed during teardown).
- **Service worker** (`background.js`):
  ```js
  let latest = null;
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "popupSession") return;
    port.onMessage.addListener((msg) => { if (msg.type === "formData") latest = msg.data; });
    port.onDisconnect.addListener(() => {
      if (latest) chrome.storage.local.set({ formData: latest }, () => void chrome.runtime.lastError);
      latest = null;
    });
  });
  ```
- This is a **belt-and-suspenders flush**: the popup still writes on each change, and the
  worker guarantees the *last* in-memory state persists even if the popup closes before
  an async write settles.

**Answered questions:**
- *Does the popup's direct write become redundant?* Mostly, but keep it — it gives
  instant persistence and the port flush only covers the closing-edge case. Cheap
  redundancy, meaningful safety.
- *MV3 service worker lifecycle?* The worker may sleep, but `onConnect`/`onDisconnect`
  fire within the connection's lifetime; the flush runs synchronously inside
  `onDisconnect` before teardown. No alarms/keepalive needed.
- *Permissions?* None added.
- *Should the worker own all writes instead?* No — over-centralizing routes every
  keystroke through messaging for little gain. Popup-writes + disconnect-flush is the
  right balance.

### D2. Stray debug log  *(low)*
- Delete `console.log("formData")` in `DisplayData` (`menu.js`).
- Keep intentional error logs but route storage errors through the helper.

### Bucket D acceptance
- Edit a row and close the popup immediately; reopen → edit persisted. Service-worker
  console shows the disconnect flush. No `"formData"` literal in console.

---

## Consolidated File-Change Map

| File | Change |
|---|---|
| `scripts/storage.js` | **NEW** — `local` wrappers, keys, settings, migration, `lastError` checks |
| `scripts/csvParser.js` | **NEW** — state-machine parser + `processCSVFile` via storage helper |
| `scripts/csvImporter.js` | **DELETE** |
| `scripts/GoogleForm.js` | Observer hoist+disconnect+debounce; `toISO`; settings-aware fill; NaN guard; match cache; storage helper; `onChanged` cache clear |
| `popup/menu.html` | Load `storage.js`+`csvParser.js` before `menu.js`; add date-format `<select>` + label |
| `popup/menu.js` | Drop inline parser; use shared modules; settings `<select>` wiring; port to background; remove debug log; surface storage errors |
| `popup/styles.css` | Style the settings `<select>` / settings section |
| `background.js` | Real save-on-close port handler |
| `manifest.json` | `content_scripts.js = ["scripts/storage.js","scripts/GoogleForm.js"]`; bump `version` |
| `Changelog.md` | Note: local storage, date-format setting, CSV fixes, save-on-close |

---

## Testing Strategy

No test framework today. Two tiers:

1. **Pure-function unit tests (optional but recommended).** `parseCSV`, `toISO`,
   `levenshteinDistance`, `CalculateSimilarity` are pure. Add a tiny `scripts/__tests__`
   runnable with `node` (no deps) to lock behavior (quoted newlines, MDY vs DMY, NaN
   guard). Cheap insurance for the trickiest logic.
2. **Manual extension test matrix** (load unpacked):
   - Migration: install over existing `sync` data → appears once.
   - Fill: DMY/MDY dates, text/email/number/tel/url, textarea, lazy sections, fuzzy
     titles (E-mail vs email). No runaway fills (temp counter).
   - CSV: the B2 matrix.
   - Save-on-close: D matrix.
   - Storage error: mock `lastError` → popup shows error.

---

## Risks & Rollback

| Risk | Mitigation |
|---|---|
| Migration clobbers newer local data | `_migrated` marker + only copy when local empty |
| Observer disconnect misses a real late field | Reconnect in `finally`; debounce catches subsequent mutations |
| `toISO` mis-parses an unanticipated format | Unmatched input passed through untouched (browser validates) |
| Shared-scope name collisions across scripts | Prefix helper globals (`gfafStorage_*`) or wrap in a single namespace object |
| Service-worker asleep at disconnect | Flush is synchronous inside `onDisconnect`; no async gap |

**Rollback:** each bucket is a separate commit; revert independently. Foundation is the
only hard-to-revert piece (storage backend) — ship it behind its own commit and verify
migration before layering A/B/D.

---

## Suggested Commit Sequence

1. `foundation: shared storage helper + local backend + sync→local migration`
2. `cleanup: remove dead csvImporter.js and debug log` (D2 + B1 deletion)
3. `csv: shared csvParser module with quote/newline-safe state machine`
4. `fill: pause observer during writes + debounce`
5. `fill: configurable date locale (DMY/MDY/AUTO) + NaN guard`
6. `fill: memoize title→match to cut Levenshtein cost`
7. `background: save-on-close port flush`
8. `chore: changelog + version bump`

Each maps cleanly to one or two Project Hub tasks; resolve them as you land each commit.
