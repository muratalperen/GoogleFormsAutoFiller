# Project Q&A

## Overview

Google Forms Auto Filler is a Manifest V3 browser extension that fills repetitive Google Form fields from a set of saved answers. The interesting part is the matching: instead of requiring exact field names, it fuzzy-matches each form field's title to a saved key using Levenshtein similarity, so one saved answer covers many phrasings of the same question. It's a zero-dependency, no-build extension where most of the engineering is in making DOM automation reliable on a dynamic, reactive page.

## Problem Solved

Anyone who fills out many Google Forms — sign-up sheets, event registrations, recurring surveys — types the same answers (name, email, phone, address) over and over. This extension stores those answers once and applies them automatically, matching fields by meaning rather than exact wording.

## Target Users

- **People who repeatedly fill similar forms** — get name/email/phone/etc. filled automatically.
- **Anyone with structured data to enter** — import a CSV of key/value pairs and reuse it across forms.

## Key Features

### Fuzzy field matching
Each form field's title is scored against every saved key two ways — normalized whole-string edit distance, and token coverage (every word of the shorter string must clear the threshold against a word of the longer one) — and the higher score wins if it clears the threshold. *E-mail* and *email* match a saved *Email* by whole-string similarity, while a verbose *Email Address* or *Phone Number* matches a short *Email* / *Phone* by token coverage. Matching is lexical, not semantic: it won't equate *mobile* with *phone*.

### Reliable auto-fill on dynamic forms
Google Forms renders sections lazily and reacts to input events. The extension fills on load and watches for new fields, while avoiding the self-triggered re-fill loop that naive DOM automation falls into.

### CSV import
Bulk-load answers from a CSV with an overwrite toggle. The parser correctly handles quoted commas, quoted newlines, `""` escapes, a BOM, and mixed line endings.

### Configurable date handling
Date inputs require `YYYY-MM-DD`, but users type `03/04/2026`. A date-format setting (DD/MM/YYYY, MM/DD/YYYY, or auto-detect) controls how ambiguous dates are normalized.

## Technical Highlights

### Breaking the observer feedback loop
Filling a field dispatches `input`/`change`, which Google Forms handles by mutating the DOM. A `MutationObserver` watching the form would fire on those self-induced mutations and re-run the fill endlessly. The fix (`scripts/GoogleForm.js`) hoists the observer, `disconnect()`s it before the write pass and reconnects in a `finally`, and debounces observer-driven fills. The observer still catches genuinely lazy-loaded sections — only the extension's own mutations are excluded.

### Quote-aware CSV parsing in a single pass
The original importer split on newlines before handling quotes, so a quoted value containing a newline corrupted every downstream row. `scripts/csvParser.js` replaces it with a character-level state machine that tracks an `inQuotes` flag, treats `""` as a literal quote, strips a leading BOM, handles `\r\n`/`\r`/`\n`, and flushes an unterminated final field instead of throwing.

### Locale-aware date normalization
`toISO(answer, fmt)` parses `D/M/Y`-style input and emits `YYYY-MM-DD`. Under auto-detect it disambiguates by value (a part `> 12` can't be a month) and falls back to a documented default when a date is genuinely ambiguous. Unparseable input is passed through untouched so the browser, not the extension, rejects it.

### Memoized matching
Levenshtein distance is O(n·m), and the fill can run repeatedly as the form mutates. Best-match results are cached per field title, keyed on the set of saved keys, and invalidated via `storage.onChanged` so live edits in the popup still take effect immediately.

## Engineering Decisions

### Local storage over synced storage
- **Constraint**: `chrome.storage.sync` caps items at ~8KB and ~100KB total; CSV imports can exceed that, and the failures are easy to swallow.
- **Options**: stay on `sync` with a size pre-flight; move to `local`; or a hybrid fallback.
- **Choice**: move to `local`, with a one-time guarded migration of existing `sync` data.
- **Why**: removes the quota ceiling entirely and keeps the storage code simple. The cost is cross-device sync, which matters little for a fill-from-saved-answers tool.

### Shared globals instead of ES modules
- **Constraint**: storage and CSV logic are needed in both the popup and the content script, which don't share an ES-module graph in MV3 without extra plumbing.
- **Options**: duplicate the code; wire up `web_accessible_resources` + dynamic imports; or expose guarded globals injected in order.
- **Choice**: IIFE-guarded namespaces (`GFAFStorage`, `GFAFCsv`) loaded via manifest/HTML order.
- **Why**: real code sharing with no bundler and no module-resolution complexity, which suits a no-build extension.

### No framework, no build step
- **Constraint**: the whole UI is a small popup and a content script.
- **Options**: a component framework + bundler, or vanilla JS.
- **Choice**: vanilla JS, zero dependencies.
- **Why**: nothing here justifies a build pipeline; it keeps the store-reviewed surface minimal and the repo directly loadable as an unpacked extension.

## Frequently Asked Questions

### How does field matching decide what to fill?
For each form field it reads the title text, lowercases and trims it, and scores it against every saved key. The score is the higher of (a) whole-string similarity, `1 - editDistance/maxLength`, and (b) token coverage — splitting both on whitespace and requiring every word of the shorter side to clear the threshold against some word of the longer side, then averaging those word matches. The highest-scoring key above the threshold is used; if nothing clears the bar, the field is left alone. So a verbose title like *Email Address* fills from a saved *Email*, while unrelated words that merely share letters (*Username* vs *Name*) stay below the bar.

### Why does it sometimes fill fields that appear after the page loads?
Google Forms adds fields dynamically (multi-page and conditional questions). A `MutationObserver` watches for those and re-runs the fill, so late-rendered fields still get populated.

### What date formats are supported?
ISO `YYYY-MM-DD` passes through as-is; `D/M/Y`-style values (with `/`, `-`, or `.` separators) are converted according to your selected format — DD/MM/YYYY, MM/DD/YYYY, or auto-detect.

### What does the CSV need to look like?
Two columns per row: key, then value. The key matches a form field's title. Quoted fields may contain commas and newlines, and `""` is treated as a literal quote.

### Will importing a CSV erase my existing answers?
No. Imports merge into your saved data; the "Overwrite existing fields" toggle controls whether matching keys are replaced. If the existing data can't be read, the import aborts rather than overwriting.

### Is my data sent anywhere?
No. Answers live in `chrome.storage.local` on your device; the extension only reads and writes the Google Forms page in your active tab.

### Which browsers does it run on?
Chrome, Firefox, and Opera, via their respective add-on stores, or loaded unpacked for development.
