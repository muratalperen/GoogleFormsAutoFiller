// import { Handlers } from './Handlers.js';
const Handlers = {
    text: {
        selector: "input[type='text'], input[type='email'], input[type='number'], input[type='tel'], input[type='url']",
        fill: (element, answer) => {
            element.value = answer;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    },
    textarea: {
        selector: "textarea",
        fill: (element, answer) => {
            element.value = answer;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    },
    date: {
        selector: "input[type='date']",
        fill: (element, answer, ctx) => {
            // Convert the incoming answer to YYYY-MM-DD using the configured
            // locale (DMY/MDY/AUTO). Unparseable input is passed through and
            // left for the browser to validate/reject.
            element.value = toISO(answer, ctx && ctx.dateFormat);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    },
};

/**
* Convert a date answer to YYYY-MM-DD according to the configured locale.
* Pure function (no side effects) so it stays unit-testable.
*
* @param {string} answer Raw date string from stored form data
* @param {string} fmt    "DMY" | "MDY" | "AUTO" (defaults to "DMY")
* @returns {string}      YYYY-MM-DD on a recognised input, else the input unchanged
*/
function toISO(answer, fmt) {
    if (typeof answer !== "string") return answer;

    // Already ISO (YYYY-MM-DD): return as-is.
    if (/^\d{4}-\d{2}-\d{2}$/.test(answer)) return answer;

    const match = answer.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (!match) return answer;

    const p1 = parseInt(match[1], 10);
    const p2 = parseInt(match[2], 10);
    const year = match[3];

    let day;
    let month;

    if (fmt === "MDY") {
        month = p1;
        day = p2;
    } else if (fmt === "AUTO") {
        if (p1 > 12) {
            // First component can't be a month -> DMY.
            day = p1;
            month = p2;
        } else if (p2 > 12) {
            // Second component can't be a month -> MDY.
            month = p1;
            day = p2;
        } else {
            // Ambiguous: documented tie-break is DMY.
            day = p1;
            month = p2;
        }
    } else {
        // Default + explicit "DMY".
        day = p1;
        month = p2;
    }

    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
}


// import { GetBestMatch } from './LevenshteinSimilarity.js';
const threshold = 79; // TODO: Not calculated best treshold.

/**
* Find best match for the title over the threshold
* TODO: make formData to more generic data type
*/
function findBestMatch(title, formData) {
    let bestMatch = null;
    let bestScore = 0;

    for (const key in formData) {
        const score = CalculateSimilarity(title.trim().toLowerCase(), key.trim().toLowerCase());
        if (score > threshold && score > bestScore) {
            bestScore = score;
            bestMatch = key;
        }
    }

    return bestMatch;
}

/**
* Calculate similarity percent.
*
* Returns the better of two scores so verbose form titles still match short
* saved keys without dropping the threshold:
*   - whole-string: normalized Levenshtein over the full strings. Handles
*     punctuation-level differences ("e-mail" vs "email").
*   - token-coverage: when one side is a multi-word phrase ("Email Address"),
*     match it against a shorter key ("Email") if every token of the shorter
*     side clears the threshold against some token of the longer side.
* Whitespace-only tokenization keeps "e-mail" a single token, so the
* whole-string path still owns the punctuation case.
*/
function CalculateSimilarity(a, b) {
    return Math.max(wholeStringSimilarity(a, b), tokenCoverageSimilarity(a, b));
}

/**
* Normalized Levenshtein similarity over the full strings.
*/
function wholeStringSimilarity(a, b) {
    const maxLength = Math.max(a.length, b.length);
    if (maxLength === 0) return 100; // two empty strings are identical
    const distance = levenshteinDistance(a, b);
    return (1 - distance / maxLength) * 100;
}

/**
* Coverage of the shorter token list by the longer one. Every token on the
* shorter side must have a whole-string match above `threshold` among the
* longer side's tokens; the score is the mean of those best per-token matches.
* Returns 0 if any token is uncovered (so it never lowers the final max).
*/
function tokenCoverageSimilarity(a, b) {
    const ta = a.split(/\s+/).filter(Boolean);
    const tb = b.split(/\s+/).filter(Boolean);
    if (ta.length === 0 || tb.length === 0) return 0;

    const [few, many] = ta.length <= tb.length ? [ta, tb] : [tb, ta];

    let total = 0;
    for (const token of few) {
        let best = 0;
        for (const candidate of many) {
            const score = wholeStringSimilarity(token, candidate);
            if (score > best) best = score;
        }
        if (best <= threshold) return 0; // an uncovered token -> no coverage match
        total += best;
    }
    return total / few.length;
}


/**
* Find levenshtein Distance of two string
* TODO: Might optimizing or caching needed. O(n * m)
*/
function levenshteinDistance(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
            }
        }
    }

    return dp[a.length][b.length];
}

const GetBestMatch = findBestMatch;


// GoogleForm.js script beginning
let form;
let formObserver = null;

// Debounce observer-driven fills so a burst of mutations coalesces into one fill.
let fillTimer = null;
function scheduleFill() {
    clearTimeout(fillTimer);
    fillTimer = setTimeout(() => FillGoogleForms(), 120);
}

// Memoize best-match per title for a given formData key-set. The match depends
// only on the keys, not their values, so the stamp is built from sorted keys.
let matchCache = new Map();
let cacheStamp = null;

/**
* Cached wrapper around GetBestMatch. Clears the cache whenever the formData
* key-set changes (stamp mismatch).
*/
function getBestMatchCached(title, formData) {
    const stamp = JSON.stringify(Object.keys(formData).sort());
    if (stamp !== cacheStamp) {
        matchCache.clear();
        cacheStamp = stamp;
    }
    if (matchCache.has(title)) {
        return matchCache.get(title);
    }
    const bestMatch = GetBestMatch(title, formData);
    matchCache.set(title, bestMatch);
    return bestMatch;
}

/**
* Fills inputs on forms page with the data
*/
function FillGoogleForms() {
    GFAFStorage.getFormData((dataError, formData) => {
        if (dataError || !formData || Object.keys(formData).length === 0) {
            console.log("No form data found in storage.");
            return;
        }
        GFAFStorage.getSettings((settingsError, settings) => {
            if (settingsError) console.warn("settings read failed, using default date format:", settingsError.message);
            const ctx = { dateFormat: (settings && settings.dateFormat) || "DMY" };
            fillPass(formData, ctx);
        });
    });

    function fillPass(formData, ctx) {
        // Pause the observer so our own input/change events don't re-trigger it.
        if (formObserver) formObserver.disconnect();
        try {
            Object.values(Handlers).forEach(handler => {
                const fields = form.querySelectorAll(handler.selector);
                fields.forEach(field => {
                    const formTitleElement = field.closest("div[role='listitem']")?.querySelector("div[role='heading']");
                    if (!formTitleElement || !formTitleElement.firstChild) return;

                    const formTitle = formTitleElement.firstChild.textContent.trim();
                    if (!formTitle) return;

                    const bestMatch = getBestMatchCached(formTitle, formData);
                    if (bestMatch) {
                        const answer = formData[bestMatch];
                        handler.fill(field, answer, ctx);
                    }
                });
            });
        } finally {
            // Reconnect with the same options so legitimately new DOM still fires.
            if (formObserver && form) {
                formObserver.observe(form, { childList: true, subtree: true });
            }
        }
    }
}

/**
* Observe the form changes and refill the form
*/
function ObserveFormChanges() {
    formObserver = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList") {
                scheduleFill();
                return;
            }
        }
    });

    formObserver.observe(form, {
        childList: true,
        subtree: true,
    });
}

function OnPageLoad() {
    form = document.querySelector("form");
    if (!form) {
        console.error("Form couldn't found. GoogleAutoFormFiller exiting...");
    } else {
        GFAFStorage.migrateSyncToLocal(() => {
            FillGoogleForms();
        });
        ObserveFormChanges();
    }
}

if(document.readyState == 'complete'){
    OnPageLoad();
} else {
    window.onload = () => OnPageLoad();
}

// Clear the match cache and refill when popup edits change stored formData,
// so live edits reflect on the form without a reload.
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[GFAFStorage.STORAGE_KEYS.formData]) {
        matchCache.clear();
        cacheStamp = null;
        scheduleFill();
    }
});

// Add listener for popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'FillGoogleForms') {
      FillGoogleForms();
      sendResponse({ status: 'Function executed' });
    }
});
