function FillGoogleForms() {
    console.log("runne");
    chrome.storage.sync.get("formData", function(result) {

        formData = result["formData"];

        var questions = document.querySelectorAll("div.m2");

        questions.forEach(function(item) {
            var formTitle = item.getAttribute("data-params").split(",")[1].slice(1, -1);
            var answer = formData[formTitle.trim()];
            console.log("data:" + formTitle.trim() + " ve " + answer)
            if (item.querySelector(".freebirdThemedInput") && answer) { // if it is input is text and answer is exist
                item.querySelector(".freebirdThemedInput").className += " hasValue";

                if (item.querySelector("input")) {
                    item.querySelector("input").value = answer;
                } else {
                    item.querySelector("textarea").innerHTML = answer;
                }
            }
        })
    });
}

window.onload = FillGoogleForms();