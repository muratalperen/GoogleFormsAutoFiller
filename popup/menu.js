//chrome.runtime.connect({ name: "googleautoformfillerPopup" });

/**
 * Parse CSV content into form data
 * @param {string} csvContent - The raw CSV content
 * @returns {Object} - Object with keys and values from the CSV
 */
function parseCSV(csvContent) {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  const formData = {};
  
  // Process each line of the CSV
  lines.forEach(line => {
    // Split by comma, but handle quoted values that might contain commas
    const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
    const parts = [];
    let match;
    
    while ((match = regex.exec(line)) !== null) {
      // Either match[1] or match[2] will contain the value
      const value = (match[1] !== undefined) 
        ? match[1].replace(/""/g, '"') // Handle double quotes in quoted strings
        : match[2] || '';
      parts.push(value);
    }
    
    // Skip if we don't have at least 2 parts (key and value)
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts[1].trim();
      
      if (key && value) {
        formData[key] = value;
      }
    }
  });
  
  return formData;
}

/**
 * Handle CSV file upload and processing
 * @param {File} file - The uploaded CSV file
 * @param {boolean} overwrite - Whether to overwrite existing entries
 * @param {Function} callback - Callback function to run with results
 */
function processCSVFile(file, overwrite, callback) {
  const reader = new FileReader();
  
  reader.onload = (event) => {
    try {
      const csvContent = event.target.result;
      const newData = parseCSV(csvContent);
      
      if (Object.keys(newData).length === 0) {
        callback({
          success: false,
          message: "No valid data found in CSV file",
          data: {}
        });
        return;
      }
      
      // Get existing data and merge
      chrome.storage.sync.get("formData", (result) => {
        const existingData = result.formData || {};
        let mergedData = { ...existingData };
        
        // Merge data based on overwrite preference
        for (const key in newData) {
          if (overwrite || !mergedData[key]) {
            mergedData[key] = newData[key];
          }
        }
        
        // Save merged data
        chrome.storage.sync.set({ "formData": mergedData }, () => {
          callback({
            success: true,
            message: `Successfully imported ${Object.keys(newData).length} entries`,
            data: mergedData
          });
        });
      });
    } catch (error) {
      callback({
        success: false,
        message: `Error processing CSV: ${error.message}`,
        data: {}
      });
    }
  };
  
  reader.onerror = () => {
    callback({
      success: false,
      message: "Failed to read the file",
      data: {}
    });
  };
  
  reader.readAsText(file);
}

window.onload = function() {
    document.getElementById("addRowBtn").addEventListener("click", () => AddNewEntry());
    document.getElementById("donate-btn").addEventListener("click", () => window.open("https://buymeacoffee.com/muratserhatalperen", "_blank"));
    document.getElementById("share-btn").addEventListener("click", () => window.open("https://github.com/muratalperen/GoogleFormsAutoFiller", "_blank"));
    document.getElementById("info-btn").addEventListener("click", () => window.open("https://github.com/muratalperen/GoogleFormsAutoFiller/blob/master/Readme.md", "_blank"));
    
    // CSV Import functionality
    document.getElementById("uploadCsvBtn").addEventListener("click", handleCsvUpload);
    document.getElementById("csvFile").addEventListener("change", function() {
        if (this.files.length > 0) {
            showStatus(`File "${this.files[0].name}" selected. Click "Upload CSV" to import.`, true);
        }
    });

    DisplayData();
}

/**
 * Handle CSV file upload button click
 */
function handleCsvUpload() {
    const fileInput = document.getElementById("csvFile");
    const overwriteCheckbox = document.getElementById("overwriteExisting");
    
    if (!fileInput.files || fileInput.files.length === 0) {
        showStatus("Please select a CSV file first", false);
        return;
    }
    
    const file = fileInput.files[0];
    const overwrite = overwriteCheckbox.checked;
    
    // Show loading status
    showStatus("Importing data...", true);
    
    // Process the CSV file
    processCSVFile(file, overwrite, function(result) {
        showStatus(result.message, result.success);
        
        if (result.success) {
            // Clear the form and display the new data
            clearFormData();
            DisplayData();
            fileInput.value = ""; // Clear the file input
        }
    });
}

/**
 * Show status message
 * @param {string} message - The message to display
 * @param {boolean} isSuccess - Whether it's a success or error message
 */
function showStatus(message, isSuccess) {
    const statusElement = document.getElementById("importStatus");
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = "status-message " + (isSuccess ? "success" : "error");
    statusElement.style.display = "block";
    
    // Hide status after 5 seconds
    setTimeout(() => {
        statusElement.style.display = "none";
    }, 5000);
}

/**
 * Clear all form rows
 */
function clearFormData() {
    const formElement = document.getElementById("formData");
    if (!formElement) return;
    
    while (formElement.firstChild) {
        formElement.removeChild(formElement.firstChild);
    }
}

/**
 * Creates and returns a new form row element
 * @param {String} key Key data
 * @param {String} val Value data
 * @returns {HTMLElement} The created row element
 */
function createFormRow(key = "", val = "") {
    const row = document.createElement('div');
    row.className = 'form-row';
    
    // Create key input
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.name = 'key[]';
    keyInput.placeholder = 'Key';
    keyInput.className = 'key-input';
    keyInput.value = key;
    keyInput.addEventListener('change', SaveData);
    
    // Create value input
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.name = 'value[]';
    valueInput.placeholder = 'Value';
    valueInput.className = 'value-input';
    valueInput.value = val;
    valueInput.addEventListener('change', SaveData);
    
    // Create remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '-';
    removeBtn.addEventListener('click', function() {
        row.remove();
        SaveData();
    });
    
    // Append elements to row
    row.appendChild(keyInput);
    row.appendChild(valueInput);
    row.appendChild(removeBtn);
    
    return row;
}

/**
 * Adds a new row to the form
 * @param {String} key Key data
 * @param {String} val Value data
 */
function AddNewEntry(key = "", val = "") {
    const formElement = document.getElementById("formData");
    if (!formElement) {
        console.error("Form data container not found!");
        return;
    }
    
    const newRow = createFormRow(key, val);
    formElement.appendChild(newRow);
    SaveData();
}

/**
* Saves the data on table to chrome storage
*/
function SaveData() {
    const rows = document.querySelectorAll('.form-row'); // Select all form rows
    const formData = {};

    rows.forEach(row => {
        const keyInput = row.querySelector('input[name="key[]"]');
        const valueInput = row.querySelector('input[name="value[]"]');

        // If both key and value inputs have values, save them
        if (keyInput && valueInput && keyInput.value.trim() && valueInput.value.trim()) {
            formData[keyInput.value.trim()] = valueInput.value.trim();
        }
    });

    // Save data and fill the forms (without trying to trigger content script)
    chrome.storage.sync.set({ "formData": formData }, () => {
        // Only try to fill forms if we're on a Google Forms page
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url && tabs[0].url.includes("docs.google.com/forms")) {
                FillGoogleForms();
            }
        });
    });
}

/**
 * Displays the data on the table
 */
function DisplayData() {
    chrome.storage.sync.get("formData", function(result) {
        const formData = result["formData"];
        console.log("formData");
        if (objectIsEmpty(formData)) {
            AddNewEntry(); // Add an empty row if there is no data
        } else {
            for (const key in formData) {
                AddNewEntry(key, formData[key]);
            }
        }
    });
}

/**
 * Fills the google forms with the data
 */
function FillGoogleForms() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        
        chrome.tabs.sendMessage(tabs[0].id, { action: 'FillGoogleForms' }, (response) => {
            // Handle the error silently - we don't need to show this to the user
            if (chrome.runtime.lastError) {
                console.log("Communication error: " + chrome.runtime.lastError.message);
                return;
            }
            // Process response if needed
            if (response && response.status) {
                console.log("Form fill status: " + response.status);
            }
        });
    });
}

/**
* Checks if parameter object is empty, null etc.
* @param    {String} object  Object to be checked
* @return   {String}         Is empty
*/
function objectIsEmpty(object) {
    var isEmpty = false;
    
    if (!object || JSON.stringify(object) == JSON.stringify({})) {
        isEmpty = true;
    }

    return isEmpty;
}