function FillGoogleForms() {
    chrome.storage.sync.get("formData", function(result) {

        formData = result["formData"];

        var questions = document.querySelectorAll("div.m2");

        questions.forEach(function(item) {
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
                    item.querySelector("textarea").innerHTML = answer;
                }
            }
        })
    });
}

window.onload = FillGoogleForms();
