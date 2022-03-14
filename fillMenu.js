window.onload = function() {

    // Add click listeners to language buttons
    var langButtons = document.querySelectorAll("#selectLang>input");
    for (var i = 0; i < langButtons.length; i++) {
        langButtons[i].addEventListener("click", setLanguageByButton, false);
    }


    // Add click listeners to add and save button
    document.getElementById("addNewEntryButton").addEventListener("click", addNewEntryButton, false);
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
* Adds clear row on button click
*/
function addNewEntryButton(mouseEvent){
    addNewEntry();
}



/**
* Adds row to table for a key & value couple
* @param    {String} key    Key data
* @param    {String} val    Value data
*/
function addNewEntry(key = "", val = "") {
    // Create input row
    var theRow = document.createElement("tr");
    var theRow = document.getElementsByTagName("tbody")[0].appendChild(theRow);

    // Create key input
    var tdK = document.createElement("td");
    theRow.appendChild(tdK);
    var inpK = document.createElement("input");
    inpK.type = "text";
    inpK.value = key;
    tdK.appendChild(inpK);

    // Create value input
    var tdV = document.createElement("td");
    theRow.appendChild(tdV);
    var inpV = document.createElement("input");
    inpV.type = "text";
    inpV.value = val;
    tdV.appendChild(inpV);

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