# Changelog

### Unreleased

- Fixed: Email fields (and any field whose heading spans multiple DOM nodes) not autofilling, caused by only reading the heading's first child node instead of its full text.
- Fixed: saved answers being silently dropped once 60+ entries were added, caused by `chrome.storage.sync`'s per-item/total size quota. Data now lives in `chrome.storage.local`, with a one-time automatic migration from any existing `sync` data.
- Added: date question support (`input[type='date']`), with a configurable date format (DD/MM/YYYY, MM/DD/YYYY, or auto-detect) in the popup.
- Added: CSV import — bulk-load key/value pairs from a CSV file, with an overwrite toggle.
- Fixed: answers could be lost if the popup was closed before its save finished; a background save-on-close flush now covers this.
- Matching: form titles now also match short saved keys by per-word token coverage, so verbose titles like *Email Address* / *Phone Number* fill from a saved *Email* / *Phone* (previously only small whole-string differences matched).
- Improved: the fill observer now pauses itself while writing values and debounces re-fills, avoiding redundant re-fill passes on fast-changing forms.
- Added a dependency-free Node test harness (`test/core.test.js`) covering the CSV parser, date normalization, and field matching.
- Removed dead code: unused `scripts/Handlers.js` and `scripts/LevenshteinSimilarity.js` reference modules (never loaded by the extension; logic lives inline in `scripts/GoogleForm.js`).

### 0.9.9

- Removed language to adding better language support.
- Added MutationObserver to handle lazyload and others.
- Script base made modular
- Added OnInput, OnChange event call to simulate user.
- Fuzzy Select by LevenshteinDistance algorithm
- Added links