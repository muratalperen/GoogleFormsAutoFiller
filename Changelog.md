# Changelog

### Unreleased

- Matching: form titles now also match short saved keys by per-word token coverage, so verbose titles like *Email Address* / *Phone Number* fill from a saved *Email* / *Phone* (previously only small whole-string differences matched).
- Added a dependency-free Node test harness (`test/core.test.js`) covering the CSV parser, date normalization, and field matching.

### 0.9.9

- Removed language to adding better language support.
- Added MutationObserver to handle lazyload and others.
- Script base made modular
- Added OnInput, OnChange event call to simulate user.
- Fuzzy Select by LevenshteinDistance algorithm
- Added links