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
        fill: (element, answer) => {
            element.value = toISODate(answer);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
};

/**
* Convert a saved date answer to the YYYY-MM-DD format native date inputs
* require. Accepts values already in ISO form, as well as DD/MM/YYYY or
* MM/DD/YYYY (with '/', '-' or '.' separators). When the day/month order is
* ambiguous (both parts <= 12) DD/MM/YYYY is assumed. Unparseable input is
* passed through unchanged so the browser can reject it as invalid.
*/
function toISODate(answer) {
    if (typeof answer !== "string") return answer;

    if (/^\d{4}-\d{2}-\d{2}$/.test(answer)) return answer;

    const match = answer.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (!match) return answer;

    const [, first, second, year] = match;
    const p1 = parseInt(first, 10);
    const p2 = parseInt(second, 10);

    let day, month;
    if (p1 > 12) {
        day = p1;
        month = p2;
    } else if (p2 > 12) {
        month = p1;
        day = p2;
    } else {
        day = p1;
        month = p2;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
* Calculate similarity percent
*/
function CalculateSimilarity(a, b) {
    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return (1 - distance / maxLength) * 100;
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

/**
* Fills inputs on forms page with the data
*/
function FillGoogleForms() {
    chrome.storage.sync.get("formData", (result) => {
        if (!result["formData"]) {
            console.log("No form data found in storage.");
            return;
        }
        OnDataFetch(result["formData"]);
    });

    function OnDataFetch(formData) {
        Object.values(Handlers).forEach(handler => {
            const fields = form.querySelectorAll(handler.selector);
            fields.forEach(field => {
                const formTitleElement = field.closest("div[role='listitem']")?.querySelector("div[role='heading']");
                if (!formTitleElement || !formTitleElement.textContent) return;

                const formTitle = formTitleElement.textContent.trim();
                const bestMatch = GetBestMatch(formTitle, formData);
                if (bestMatch) {
                    const answer = formData[bestMatch];
                    handler.fill(field, answer);
                }
            });
        });
    }
}

/**
* Observe the form changes and refill the form
*/
function ObserveFormChanges() {
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList") {
                FillGoogleForms();
            }
        }
    });

    observer.observe(form, {
        childList: true,
        subtree: true,
    });
}

function OnPageLoad() {
    form = document.querySelector("form");
    if (!form) {
        console.error("Form couldn't found. GoogleAutoFormFiller exiting...");
    } else {
        FillGoogleForms();
        ObserveFormChanges();
    }
}

if(document.readyState == 'complete'){
    OnPageLoad();
} else {
    window.onload = () => OnPageLoad();
}

// Add listener for popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'FillGoogleForms') {
      FillGoogleForms();
      sendResponse({ status: 'Function executed' });
    }
});
