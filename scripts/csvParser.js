// Shared CSV parser for Google Forms Auto Filler.
//
// Like storage.js, this file uses NO ES module `export`. It exposes a single
// namespace object on the global scope: GFAFCsv. A double-definition guard makes
// it safe to inject alongside other shared-scope scripts without clobbering an
// existing definition.
//
// parseCSV(text) is a PURE function (string in, object out) so it is
// unit-testable without any browser APIs. processCSVFile reads/writes through
// GFAFStorage so all storage errors are surfaced.

(function () {
    "use strict";

    if (typeof globalThis.GFAFCsv !== "undefined") {
        // Already defined in this scope (e.g. injected twice). Keep the first.
        return;
    }

    /**
     * Parse CSV text into a { key: value } object.
     *
     * Single-pass state machine over the whole text:
     *   - Tracks `inQuotes`. A field is accumulated character by character.
     *   - An unquoted comma ends the current field; an unquoted newline ends the
     *     current row. \r\n, \r, and \n are all treated as one row terminator.
     *   - Inside a quoted field, "" is a literal ". A quoted field preserves its
     *     internal whitespace and newlines.
     *   - A leading UTF-8 BOM is stripped before parsing.
     *   - On EOF while still inQuotes (unterminated quote), the field is flushed
     *     as-is rather than throwing.
     *
     * Row semantics (unchanged from prior behavior):
     *   - First two columns are key,value; extra columns are ignored.
     *   - Rows with fewer than 2 non-empty cells, or with an empty key or value,
     *     are skipped.
     *   - Key and value are trimmed (a quoted value still keeps internal
     *     whitespace/newlines; only leading/trailing whitespace is trimmed).
     *
     * @param {string} text - The raw CSV content.
     * @returns {Object} - Object with keys and values from the CSV.
     */
    function parseCSV(text) {
        const formData = {};
        if (typeof text !== "string" || text.length === 0) {
            return formData;
        }

        // Strip a leading UTF-8 BOM if present.
        if (text.charCodeAt(0) === 0xfeff) {
            text = text.slice(1);
        }

        let row = [];
        let field = "";
        let inQuotes = false;
        const len = text.length;

        const endField = () => {
            row.push(field);
            field = "";
        };

        const endRow = () => {
            endField();
            commitRow(formData, row);
            row = [];
        };

        for (let i = 0; i < len; i++) {
            const ch = text[i];

            if (inQuotes) {
                if (ch === '"') {
                    if (text[i + 1] === '"') {
                        // Escaped quote -> literal ".
                        field += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += ch;
                }
                continue;
            }

            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ",") {
                endField();
            } else if (ch === "\r") {
                // Treat \r and \r\n as a single row terminator.
                endRow();
                if (text[i + 1] === "\n") {
                    i++;
                }
            } else if (ch === "\n") {
                endRow();
            } else {
                field += ch;
            }
        }

        // Flush the trailing field/row. On EOF while inQuotes, the field is
        // flushed as-is (unterminated quote tolerated).
        if (field !== "" || row.length > 0) {
            endRow();
        }

        return formData;
    }

    /**
     * Apply one parsed row to the accumulator, honoring the key/value semantics.
     */
    function commitRow(formData, cells) {
        // Need at least 2 non-empty cells to form a key/value pair.
        const nonEmpty = cells.filter((c) => c.trim() !== "").length;
        if (nonEmpty < 2) {
            return;
        }

        const key = cells[0].trim();
        const value = cells[1].trim();
        if (key && value) {
            formData[key] = value;
        }
    }

    /**
     * Handle CSV file upload and processing.
     *
     * Reads the file, parses it, merges into the stored form data (honoring
     * `overwrite`), and persists via GFAFStorage. On a save error reports
     * { success:false, message } to the callback (never reports success on a
     * failed write).
     *
     * @param {File} file - The uploaded CSV file.
     * @param {boolean} overwrite - Whether to overwrite existing entries.
     * @param {Function} cb - Callback invoked with a result object.
     */
    function processCSVFile(file, overwrite, cb) {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const csvContent = event.target.result;
                const newData = parseCSV(csvContent);

                if (Object.keys(newData).length === 0) {
                    cb({
                        success: false,
                        message: "No valid data found in CSV file",
                        data: {}
                    });
                    return;
                }

                // Get existing data and merge (via shared helper so lastError is checked).
                GFAFStorage.getFormData((getErr, existingData) => {
                    if (getErr) {
                        // Abort rather than merging onto an empty object, which would
                        // overwrite and wipe the user's existing saved entries.
                        cb({
                            success: false,
                            message: `Failed to read existing data: ${getErr.message}`,
                            data: {}
                        });
                        return;
                    }

                    const mergedData = Object.assign({}, existingData || {});

                    // Merge data based on overwrite preference.
                    for (const key in newData) {
                        if (overwrite || !mergedData[key]) {
                            mergedData[key] = newData[key];
                        }
                    }

                    // Save merged data; surface a write failure instead of reporting success.
                    GFAFStorage.setFormData(mergedData, (setErr) => {
                        if (setErr) {
                            cb({
                                success: false,
                                message: `Failed to save imported data: ${setErr.message}`,
                                data: {}
                            });
                            return;
                        }
                        cb({
                            success: true,
                            message: `Successfully imported ${Object.keys(newData).length} entries`,
                            data: mergedData
                        });
                    });
                });
            } catch (error) {
                cb({
                    success: false,
                    message: `Error processing CSV: ${error.message}`,
                    data: {}
                });
            }
        };

        reader.onerror = () => {
            cb({
                success: false,
                message: "Failed to read the file",
                data: {}
            });
        };

        reader.readAsText(file);
    }

    globalThis.GFAFCsv = {
        parseCSV,
        processCSVFile
    };
})();
