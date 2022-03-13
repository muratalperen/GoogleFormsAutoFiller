/**
* Fills inputs on forms page with the data
*/
function FillGoogleForms() {
    chrome.storage.sync.get("formData", function(result) {
        formData = result["formData"];
        var FormElement = document.getElementsByTagName("form")[0];
        
        // Fill text fields
        var selectorStr = "input[type='text'], input[type='email'], input[type='number'], input[type='tel'], input[type='url']";
        var fields = FormElement.querySelectorAll(selectorStr);
        fields.forEach(function(item) {
            var formTitle = item.getAttribute("data-params").split(",")[1].slice(1, -1);
            var answer = formData[formTitle.trim()];
            if (item.querySelector(".freebirdThemedInput") && answer) { // if the input is text and answer is exist
                item.querySelector(".freebirdThemedInput").className += " hasValue";

                if (item.querySelector("input")) {
                    item.querySelector("input").value = answer;
                    item.querySelector("input").setAttribute("value", answer);
                    item.querySelector("input").setAttribute("data-initial-value", answer);
                    item.querySelector("input").setAttribute("badinput", "false");
                } else {
                    item.querySelector("textarea").textContent = answer;
                }
            }
        });

        // Fill textareas

        
    });
}

window.onload = FillGoogleForms();