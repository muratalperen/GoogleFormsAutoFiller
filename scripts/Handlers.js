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
            element.value = toISODate(answer);
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

/**
* Convert a saved date answer to the YYYY-MM-DD format native date inputs
* require. Accepts values already in ISO form, as well as DD/MM/YYYY or
* MM/DD/YYYY (with '/', '-' or '.' separators). When the day/month order is
* ambiguous (both parts <= 12) DD/MM/YYYY is assumed. Unparseable input is
* passed through unchanged so the browser can reject it as invalid.
*/
function toISODate(answer) {
    if (typeof answer !== "string") return answer;

    if (/^\d{4}-\d{2}-\d{2}$/.test(answer)) return answer;

    const match = answer.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (!match) return answer;

    const [, first, second, year] = match;
    const p1 = parseInt(first, 10);
    const p2 = parseInt(second, 10);

    let day, month;
    if (p1 > 12) {
        day = p1;
        month = p2;
    } else if (p2 > 12) {
        month = p1;
        day = p2;
    } else {
        day = p1;
        month = p2;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
