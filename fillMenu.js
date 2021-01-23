document.getElementById("addNewEntryButton").addEventListener("click", addNewEntry, false);
document.getElementById("saveDataButton").addEventListener("click", saveData, false);

// List form datas
var formData = {};
chrome.storage.local.get("formData", function(result) {
    formData = result["formData"];
    for (key in formData) {
        addNewEntry(key, formData[key]);
    }
});
if (!formData) {
    var formData = {};
    chrome.storage.local.set({ "formData": formData });
}


function addNewEntry(key = "", val = "") {
    if (typeof(key) != "string") {
        key = "";
    }

    // Fix for the problem of deleting when a new entry is insert
    var currInputs = document.querySelectorAll('input[type="text"]');
    for (var i = 0; i < currInputs.length; i++) {
        currInputs[i].setAttribute("value", currInputs[i].value);
    }

    document.getElementsByTagName("tbody")[0].innerHTML += '\
        <tr>\
            <td><input type="text" value="' + key.trim() + '"></td>\
            <td><input type="text" value="' + val.trim() + '"></td>\
        </tr>';
    return false;
}

function saveData() {
    var saveButton = document.getElementById("saveDataButton");
    var savedText = document.getElementById("savedText");
    saveButton.disabled = true;

    var inputs = document.querySelectorAll('input[type="text"]');
    var formData = {};
    for (var i = 0; i < inputs.length / 2; i++) {
        if (inputs[i * 2].value && inputs[i * 2 + 1].value) {
            formData[inputs[i * 2].value] = inputs[i * 2 + 1].value.trim();
        } else {
            inputs[i * 2].parentNode.parentNode.remove();
        }
    }

    chrome.storage.local.set({ "formData": formData });

    chrome.tabs.executeScript({
        code: "FillGoogleForms();"
    });

    saveButton.disabled = false;
    savedText.style.opacity = 1;
    var opacityInterval = setInterval(() => {
        savedText.style.opacity -= 0.01;
        if (savedText.style.opacity == 0) {
            clearInterval(opacityInterval);
        }
    }, 10);
}