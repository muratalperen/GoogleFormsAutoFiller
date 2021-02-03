var langLib = {
    "en": {
        "title": "Google Forms Auto Filler",
        "label": "Label",
        "value": "Value",
        "saved": "Saved",
        "add": "Add",
        "save": "Save"
    },
    "tr": {
        "title": "Google Forms Doldurucu",
        "label": "Başlık",
        "value": "Cevap",
        "saved": "Kaydedildi",
        "add": "Ekle",
        "save": "Kaydet"
    }
}

window.onload = function() {
    // Set language
    setLanguage();

    // Add click listeners to language buttons
    var langButtons = document.querySelectorAll("#selectLang>input");
    for (var i = 0; i < langButtons.length; i++) {
        langButtons[i].addEventListener("click", setLanguage, false);
    }


    // Add click listeners to add and save button
    document.getElementById("addNewEntryButton").addEventListener("click", addNewEntry, false);
    document.getElementById("saveDataButton").addEventListener("click", saveData, false);

    // List form datas
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

function setLanguage(langEvent = null) {
    chrome.storage.sync.get("language", function(result) {
        var lang = "en"; // default language is english
        if (langEvent) { // if lang set by button
            lang = langEvent.srcElement.value;
        } else if (!objectIsEmpty(result["language"])) { // if lang set before
            lang = result["language"];
        }

        var currentLanguage = langLib[lang];
        var textElements = document.querySelectorAll("[data-lang]");

        chrome.storage.sync.set({ "language": lang }, function() {
            console.log("Language set: " + lang);
        });
        for (var i = 0; i < textElements.length; i++) {
            textElements[i].innerHTML = currentLanguage[textElements[i].getAttribute("data-lang")];
        }
    });
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
            <td><input type="text" value="' + key + '"></td>\
            <td><input type="text" value="' + val + '"></td>\
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
            formData[inputs[i * 2].value.trim()] = inputs[i * 2 + 1].value.trim();
        } else {
            inputs[i * 2].parentNode.parentNode.remove();
        }
    }

    chrome.storage.sync.set({ "formData": formData }, function() {
        console.log("Form data saved: " + formData);
    });

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


function objectIsEmpty(object) {
    var isEmpty = true;
    if (!object) {
        isEmpty = true;
    } else if (JSON.stringify(object) == JSON.stringify({})) {
        isEmpty = true;
    } else {
        isEmpty = false;
    }
    return isEmpty;
}