//chrome.runtime.connect({ name: "googleautoformfillerPopup" });
window.onload = function() {
    document.getElementById("addRowBtn").addEventListener("click", () => AddNewEntry());
    document.getElementById("donate-btn").addEventListener("click", () => window.open("#", "_blank"));
    document.getElementById("share-btn").addEventListener("click", () => window.open("https://github.com/muratalperen/GoogleFormsAutoFiller", "_blank"));
    document.getElementById("info-btn").addEventListener("click", () => window.open("#", "_blank"));

    DisplayData();
}


/**
 * Adds a new row to the form using the template
 * @param {String} key Key data
 * @param {String} val Value data
 */
function AddNewEntry(key = "", val = "") {
    const template = document.getElementById("formRowTemplate");
    const formElement = document.getElementById("formData");

    // Clone the template content
    const newRow = template.content.cloneNode(true);

    const inputs = newRow.querySelectorAll("input");
    inputs[0].value = key;
    inputs[1].value = val;
    inputs[0].addEventListener("change", SaveData);
    inputs[1].addEventListener("change", SaveData);

    // Add remove functionality to the button
    const removeButton = newRow.querySelector(".remove-btn");
    removeButton.addEventListener("click", () => {
        removeButton.parentElement.remove();
        SaveData();
    });

    // Append the new row to the form
    formElement.appendChild(newRow);
    SaveData();
}


/**
* Saves the data on table to chrome storage
*/
function SaveData() {
    const rows = document.querySelectorAll('.form-row'); // Select all form rows
    const formData = {};

    rows.forEach(row => {
        const keyInput = row.querySelector('input[name="key[]"]');
        const valueInput = row.querySelector('input[name="value[]"]');

        // If both key and value inputs have values, save them
        if (keyInput.value.trim() && valueInput.value.trim()) {
            formData[keyInput.value.trim()] = valueInput.value.trim();
        }
    });

    // Save data and fill the forms
    chrome.storage.sync.set({ "formData": formData }, FillGoogleForms);
}

/**
 * Displays the data on the table
 */
function DisplayData() {
    chrome.storage.sync.get("formData", function(result) {
        const formData = result["formData"];
        console.log("formData");
        if (objectIsEmpty(formData)) {
            AddNewEntry(); // Add an empty row if there is no data
        } else {
            for (key in formData) {
                AddNewEntry(key, formData[key]);
            }
        }
    });
}


/**
 * Fills the google forms with the data
 */
function FillGoogleForms() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'FillGoogleForms' }, (response) => {
          //console.log(response.status);
        });
    });
}



/**
* Checks if parameter object is empty, null etc.
* @param    {String} object  Object to be checked
* @return   {String}         Is empty
*/
function objectIsEmpty(object) {
    var isEmpty = false;
    
    if (!object || JSON.stringify(object) == JSON.stringify({})) {
        isEmpty = true;
    }

    return isEmpty;
}