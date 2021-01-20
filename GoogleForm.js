chrome.storage.local.get("formData", function(result) {
    formData = result["formData"];

    var questions = document.querySelectorAll("div.m2");

    questions.forEach(function(item) {
        var formTitle = item.getAttribute("data-params").match(/"(\s|\w)+",/g)[0].slice(1, -2);
        if (item.querySelector(".freebirdThemedInput") && formData[formTitle]) { // if it is input is text and answer is exist
            item.querySelector(".freebirdThemedInput").className += " hasValue";

            if (item.querySelector("input")) {
                item.querySelector("input").value = formData[formTitle];
            } else {
                item.querySelector("textarea").innerHTML = formData[formTitle];
            }
        }
    })
});