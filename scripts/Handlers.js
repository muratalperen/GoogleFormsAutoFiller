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
    }
    // date: {
    //     selector: "input[type='date']",
    //     fill: (element, answer) => {
    //         element.value = answer; // YYYY-MM-DD formatını kontrol et
    //     }
    // },
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
