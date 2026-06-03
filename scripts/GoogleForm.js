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
            // Ensure the date is in YYYY-MM-DD format for HTML date input
            let formattedDate = answer;
            
            // Check if the answer is in DD/MM/YYYY or MM/DD/YYYY format and convert to YYYY-MM-DD.
            // Both formats share the same shape, so disambiguate using the value: whichever
            // part can't be a month (>12) must be the day. Ambiguous dates default to DD/MM/YYYY.
            if (answer.match(/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/)) {
                const parts = answer.split(/[\/\-\.]/);
                const first = parseInt(parts[0], 10);
                const second = parseInt(parts[1], 10);
                const [day, month] = first > 12 ? [first, second] : second > 12 ? [second, first] : [first, second];
                formattedDate = `${parts[2]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
            
            // Set the value and dispatch events
            element.value = formattedDate;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    },
};


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
    GFAFStorage.getFormData((error, formData) => {
        if (error || !formData || Object.keys(formData).length === 0) {
            console.log("No form data found in storage.");
            return;
        }
        OnDataFetch(formData);
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

// Add listener for popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'FillGoogleForms') {
      FillGoogleForms();
      sendResponse({ status: 'Function executed' });
    }
});
