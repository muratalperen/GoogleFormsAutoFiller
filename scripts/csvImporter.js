/**
 * CSV Importer for Google Forms Auto Filler
 * This script provides functions to parse CSV files and integrate with the existing extension
 */

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