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




/**
* Sets page language with the selected language on storage
*/
function setLanguageOnWindowLoad(){
    chrome.storage.sync.get("language", function(result) {
        var lang = "en"; // default language is English

        // set language if set before
        if (!objectIsEmpty(result["language"])) {
            lang = result["language"];
        }

        setLanguage(lang);
    });
}



/**
* Sets page language on button click
* @param    {String} langEvent  button click event data
*/
function setLanguageByButton(langEvent) {
    chrome.storage.sync.get("language", function(result) {
        var lang = langEvent.srcElement.value;

        setLanguage(lang);        
    });
}



/**
* Sets page language
* @param    {String} name    Name of the user
*/
function setLanguage(lang){
    // Get elements to be translated
    var textElements = document.querySelectorAll("[data-lang]");

    // Update current language information
    chrome.storage.sync.set({ "language": lang }, function() {
        console.log("Language switched to: " + lang);
    });
    
    // Update texts on screen
    for (var i = 0; i < textElements.length; i++) {
        var dataName = textElements[i].getAttribute("data-lang");
        textElements[i].textContent = langLib[lang][dataName];
    }
}

window.onload = setLanguageOnWindowLoad();