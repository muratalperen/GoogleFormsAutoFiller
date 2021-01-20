var formData = JSON.parse(localStorage.getItem("formData"));

var questions = document.querySelectorAll("div.m2");

questions.forEach(function(item) {
    var formTitle = item.getAttribute("data-params").match(/"(\s|\w)+",/g)[0].slice(1, -2);
    if (item.querySelector(".freebirdThemedInput") != null) {
        item.querySelector(".freebirdThemedInput").className += " hasValue";
        item.querySelector("input").value = formData[formTitle];
    }
})