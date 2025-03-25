export const Handlers = {
    text: {
        selector: "input[type='text'], input[type='email'], input[type='number'], input[type='tel'], input[type='url']",
        fill: (element, answer) => {
            element.value = answer;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    },
    textarea: {
        selector: "textarea",
        fill: (element, answer) => {
            element.value = answer;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    },
    date: {
        selector: "input[type='date']",
        fill: (element, answer) => {
            // Ensure the date is in YYYY-MM-DD format for HTML date input
            let formattedDate = answer;
            
            // Check if the answer is in DD/MM/YYYY or MM/DD/YYYY format and convert to YYYY-MM-DD
            if (answer.match(/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/)) {
                const parts = answer.split(/[\/\-\.]/);
                // Assuming DD/MM/YYYY format - adjust as needed for your locale
                formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else if (answer.match(/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/)) {
                const parts = answer.split(/[\/\-\.]/);
                // Assuming MM/DD/YYYY format
                formattedDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            }
            
            // Set the value and dispatch events
            element.value = formattedDate;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    // time: {
    //     selector: "input[type='time']",
    //     fill: (element, answer) => {
    //         element.value = answer; // HH:MM formatını kontrol et
    //     }
    // },
    // multipleChoice: {
    //     selector: "div[role='radiogroup']",
    //     fill: (element, answer) => {
    //         const options = element.querySelectorAll("div[role='radio']");
    //         options.forEach(option => {
    //             if (option.textContent.trim() === answer) {
    //                 option.click(); // Seçeneği işaretle
    //             }
    //         });
    //     }
    // }
};
