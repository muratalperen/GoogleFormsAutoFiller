import { Handlers } from './Handlers.js';
import { GetBestMatch } from './LevenshteinSimilarity.js';

let form;

/**
* Fills inputs on forms page with the data
*/
function FillGoogleForms() {
    chrome.storage.sync.get("formData", chrome.storage.sync.get("formData", (result) => {
        if (!result["formData"]) {
            console.log("No form data found in storage.");
            return;
        }
        OnDataFetch(result["formData"]);
    }));

    function OnDataFetch(formData) {
        Object.values(Handlers).forEach(handler => {
            const fields = form.querySelectorAll(handler.selector);
            fields.forEach(field => {
                const formTitleElement = field.closest("div[role='listitem']")?.querySelector("div[role='heading']");
                if (!formTitleElement || !formTitleElement.firstChild) return;

                const formTitle = formTitleElement.firstChild.textContent.trim();
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


window.onload = () => {
    form = document.querySelector("form");
    if (!form) {
        console.error("Form couldn't found. GoogleAutoFormFiller exiting...");
        return;
    }
    FillGoogleForms();
    ObserveFormChanges();
};