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
            var formTitle = item.closest("div[role='listitem']").querySelector("div[role='heading']").firstChild.textContent;
            var answer = formData[formTitle.trim()];
            if (answer) {
                item.value = answer;
                //item.setAttribute("value", answer);
                item.setAttribute("data-initial-value", answer);
                item.setAttribute("badinput", "false");
                // TODO: find the class that hides input inside text by reversed css finding
                item.nextElementSibling.style.display = "none";

                // Idk what it is but smt changing:
                try{
                    var idmsi = 0;
                    for(let i=0; i<FB_PUBLIC_LOAD_DATA_[1][1].length; i++){
                        if(FB_PUBLIC_LOAD_DATA_[1][1][i][1] == formTitle){
                            idmsi = FB_PUBLIC_LOAD_DATA_[1][1][i][4][0][0];
                        }
                    }
                    document.querySelector("input[name='entry." + idmsi + "']").value = answer;
                }
                catch(err){
                    console.log("Load data error");
                }
            }
        });

        // Fill textareas

        
    });
}


window.onload = FillGoogleForms();