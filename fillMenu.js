document.getElementById("addNewEntryButton").addEventListener("click", addNewEntry, false);
document.getElementById("saveDataButton").addEventListener("click", saveData, false);
var formData = {};
chrome.storage.local.get("formData", function(result) {
    formData = result["formData"];
    for (key in formData) {
        console.log("keyin: " + key);
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
    document.getElementsByTagName("tbody")[0].innerHTML += '\
    <tr>\
        <td><input type="text" value="' + key + '"></td>\
        <td><input type="text" value="' + val + '"></td>\
    </tr>';
    return false;
}

function saveData() {
    var inputs = document.querySelectorAll('input[type="text"]');
    var formData = {};
    for (var i = 0; i < inputs.length / 2; i++) {
        if (inputs[i * 2].value && inputs[i * 2 + 1].value) {
            formData[inputs[i * 2].value] = inputs[i * 2 + 1].value;
        } else {
            inputs[i * 2].parentNode.parentNode.remove();
        }
    }

    chrome.storage.local.set({ "formData": formData });
}