# Tech Stack

## Core Technologies

| Category | Technology | Version | Why this choice |
|----------|------------|---------|-----------------|
| Language | JavaScript (ES2020) | — | Browser-native; an extension this size needs no compile step or type layer |
| Platform | Browser extension, Manifest V3 | `manifest_version: 3` | Current extension standard; required for new Chrome Web Store submissions |
| Storage | `chrome.storage.local` | — | No per-item quota cap; reliable for bulk CSV imports |
| Packaging | `zip` | — | The store artifact is just the source tree zipped; no build pipeline needed |

## Frontend (popup)

- **Framework**: none — hand-written DOM in `popup/menu.js`
- **State Management**: `chrome.storage.local` via the `GFAFStorage` helper; the UI is rebuilt from stored data on open
- **Styling**: plain CSS (`popup/styles.css`)
- **Build Tool**: none

## Extension Surfaces

- **Content script**: `scripts/storage.js` + `scripts/GoogleForm.js`, injected on `*://docs.google.com/forms/*`
- **Service worker**: `background.js` (save-on-close port)
- **Action popup**: `popup/menu.html`
- **Permissions**: `activeTab`, `storage`; host permission `https://docs.google.com/*`

## Infrastructure

- **Hosting**: distributed via Chrome Web Store, Firefox Add-ons, and Opera Add-ons
- **CI/CD**: none — manual packaging
- **Monitoring**: none (client-side extension)

## Development Tools

- **Package Manager**: none (zero dependencies)
- **Linting**: none
- **Formatting**: none
- **Testing**: `test/core.test.js` — a dependency-free Node harness that loads the real content-script sources into a `vm` sandbox (stubbing the browser globals they touch at load time) and asserts on the actual `parseCSV`, `toISO`, and matching functions. Run with `node test/core.test.js`; no framework, consistent with the zero-build stance

## Key Dependencies

None. The extension ships only its own source — no runtime libraries, no transitive packages — which keeps the reviewed surface small and the install size minimal.
