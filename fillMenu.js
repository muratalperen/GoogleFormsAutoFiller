window.onload = function() {

    // Add click listeners to language buttons
    var langButtons = document.querySelectorAll("#selectLang>input");
    for (var i = 0; i < langButtons.length; i++) {
        langButtons[i].addEventListener("click", setLanguageByButton, false);
    }


    // Add click listeners to add and save button
    document.getElementById("addNewEntryButton").addEventListener("click", addNewEntry, false);
    document.getElementById("saveDataButton").addEventListener("click", saveData, false);


    // List saved form data
    var formData = {};
    chrome.storage.sync.get("formData", function(result) {
        formData = result["formData"];

        if (objectIsEmpty(formData)) {
            addNewEntry();
        } else {
            for (key in formData) {
                addNewEntry(key, formData[key]);
            }
        }
    });
}



/**
* Adds row to table for a key & value couple
* @param    {String} key    Key data
* @param    {String} val    Value data
*/
function addNewEntry(key = "", val = "") {
    if (typeof(key) != "string") { //?
        key = "";
    }

    // Fix for the problem of deleting when a new entry is insert
    var currInputs = document.querySelectorAll('input[type="text"]');
    for (var i = 0; i < currInputs.length; i++) {
        currInputs[i].setAttribute("value", currInputs[i].value);
    }

    document.getElementsByTagName("tbody")[0].innerHTML += '\
        <tr>\
            <td><input type="text" value="' + key + '"></td>\
            <td><input type="text" value="' + val + '"></td>\
        </tr>';
    return false;
}



/**
* Saves the data on table
*/
function saveData() {
    var saveButton = document.getElementById("saveDataButton");
    var savedText = document.getElementById("savedText");
    saveButton.disabled = true;

    // Get datas from inputs and remove empty inputs
    var inputs = document.querySelectorAll('input[type="text"]');
    var formData = {};
    for (var i = 0; i < inputs.length / 2; i++) {
        if (inputs[i * 2].value && inputs[i * 2 + 1].value) {
            formData[inputs[i * 2].value.trim()] = inputs[i * 2 + 1].value.trim();
        } else {
            inputs[i * 2].parentNode.parentNode.remove();
        }
    }

    // Save data
    chrome.storage.sync.set({ "formData": formData }, function() {
        console.log("Form data saved: " + formData);
        
        // Fill forms with new data
        chrome.tabs.executeScript({
            code: "FillGoogleForms();"
        });
    });


    // Saved text animation
    saveButton.disabled = false;
    savedText.style.opacity = 1;
    var opacityInterval = setInterval(() => {
        savedText.style.opacity -= 0.01;
        if (savedText.style.opacity == 0) {
            clearInterval(opacityInterval);
        }
    }, 10);
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