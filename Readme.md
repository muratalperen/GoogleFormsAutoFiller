# Google Forms Auto Filler

A browser extension that automatically fills repetitive Google Form fields from a set of saved answers.

Save a value once — say *Name → John* — and every form field whose title matches *Name* is populated the moment the page loads. Matching is fuzzy (Levenshtein-based), so *E-mail*, *email*, and *Email Address* all resolve to the same saved answer without exact-string configuration. Built as a single Manifest V3 extension with no framework and no build step.

## Features

- **Fuzzy field matching** — form titles match saved keys by whole-string edit distance *and* per-word token coverage, so both `E-mail`→`Email` and a verbose `Email Address` / `Phone Number`→`Email` / `Phone` fill correctly. Matching is lexical, not semantic (it won't equate `mobile` with `phone`).
- **Auto-fill on load + lazy sections** — a `MutationObserver` re-fills fields that Google Forms renders late (multi-page/conditional forms), without re-triggering itself.
- **CSV import** — bulk-load key/value pairs from a CSV, with an overwrite toggle and a parser that tolerates quoted commas, quoted newlines, and `""` escapes.
- **Configurable date locale** — choose DD/MM/YYYY, MM/DD/YYYY, or auto-detect; dates are normalized to the `YYYY-MM-DD` value HTML date inputs require.
- **Local persistence with save-on-close** — answers are stored in `chrome.storage.local`; a service-worker port flushes the latest state when the popup closes.
- **Text, email, number, tel, url, textarea, and date inputs** are supported.

## Tech Stack

- **Language**: Vanilla JavaScript (ES2020), no framework
- **Platform**: Browser extension, Manifest V3 (Chrome, Firefox, Opera)
- **Storage**: `chrome.storage.local`
- **Dependencies**: none (zero npm packages, no bundler)

## Getting Started

### Install from a store

- Firefox: <https://addons.mozilla.org/en-US/firefox/addon/google-forms-auto-filler/>
- Chrome: <https://chrome.google.com/webstore/detail/google-forms-auto-filler/jdjlkmjjmpdbmejkicfjokkgifdkpjek>
- Opera: <https://addons.opera.com/en/extensions/details/google-forms-auto-filler/>

### Load unpacked (development)

1. Open `chrome://extensions` (or `about:debugging` in Firefox).
2. Enable Developer Mode.
3. "Load unpacked" → select this repository's root.

### Usage

1. Click the extension icon to open the popup.
2. Add key/value pairs (the key matches the form field's title) or import a CSV.
3. Optionally pick your date format.
4. Open any `docs.google.com/forms/...` page — matching fields fill automatically.

## Development

No install or build step — it's plain JS loaded directly by the browser.

```bash
# Syntax-check the scripts
node --check scripts/storage.js scripts/csvParser.js scripts/GoogleForm.js popup/menu.js background.js

# Run the core-logic tests (CSV parser, date normalization, field matching).
# No dependencies — plain Node loads the real sources in a sandbox.
node test/core.test.js

# Package for the Chrome Web Store
zip -r -FS build/Chrome/GoogleFormsAutoFiller.zip * --exclude '*.git*' 'build/*'
```

## Project Structure

```
GoogleFormsAutoFiller/
├── manifest.json          # MV3 manifest: content script, popup, service worker
├── background.js          # Service worker: save-on-close port flush
├── scripts/
│   ├── storage.js         # Shared storage helper (GFAFStorage) + sync→local migration
│   ├── csvParser.js       # Shared CSV state-machine parser (GFAFCsv)
│   └── GoogleForm.js      # Content script: matching, filling, observer
├── popup/
│   ├── menu.html          # Popup UI
│   ├── menu.js            # Popup logic: editing, CSV import, settings
│   └── styles.css         # Popup styles
└── test/
    └── core.test.js       # Dependency-free tests: CSV, dates, matching
```

## License

See [LICENSE](LICENSE).

## Acknowledgements

Originally created by Murat Alperen ([upstream project](https://github.com/muratalperen/GoogleFormsAutoFiller)). This repository is a fork with additional features and engineering work described in `.portfolio/`.

## Author

Jacob Kanfer — [GitHub](https://github.com/Technical-1)
