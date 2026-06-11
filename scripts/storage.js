// Shared storage helper for Google Forms Auto Filler.
//
// MV3 content scripts (listed in content_scripts.js) and popup <script> tags
// share an isolated-world global scope, so this file deliberately uses NO ES
// module `export`. Instead it exposes a single namespace object on the global
// scope: GFAFStorage. A double-definition guard makes it safe to inject this
// file alongside GoogleForm.js (which lives in the same scope) without
// clobbering an existing definition.
//
// All callbacks follow the (error, value) convention. error is null on success.
// Every write inspects chrome.runtime.lastError and forwards it to the caller.

(function () {
    "use strict";

    if (typeof globalThis.GFAFStorage !== "undefined") {
        // Already defined in this scope (e.g. injected twice). Keep the first.
        return;
    }

    const STORAGE_KEYS = { formData: "formData", settings: "settings" };
    const DEFAULT_SETTINGS = { dateFormat: "DMY" }; // "DMY" | "MDY" | "AUTO"

    const MIGRATED_MARKER = "_migrated";

    function gfafIsEmpty(obj) {
        return !obj || Object.keys(obj).length === 0;
    }

    /**
     * Read saved form data. cb(error, data). data is {} when absent.
     */
    function getFormData(cb) {
        chrome.storage.local.get(STORAGE_KEYS.formData, (result) => {
            const err = chrome.runtime.lastError || null;
            if (err) console.warn("storage read failed:", err.message);
            const data = (result && result[STORAGE_KEYS.formData]) || {};
            cb && cb(err, data);
        });
    }

    /**
     * Write form data. cb(error). Inspects chrome.runtime.lastError.
     */
    function setFormData(data, cb) {
        chrome.storage.local.set({ [STORAGE_KEYS.formData]: data }, () => {
            const err = chrome.runtime.lastError || null;
            if (err) console.warn("storage write failed:", err.message);
            cb && cb(err);
        });
    }

    /**
     * Read settings merged over DEFAULT_SETTINGS. cb(error, settings).
     */
    function getSettings(cb) {
        chrome.storage.local.get(STORAGE_KEYS.settings, (result) => {
            const err = chrome.runtime.lastError || null;
            if (err) console.warn("storage read failed:", err.message);
            const stored = (result && result[STORAGE_KEYS.settings]) || {};
            const settings = Object.assign({}, DEFAULT_SETTINGS, stored);
            cb && cb(err, settings);
        });
    }

    /**
     * Merge a partial settings object over the existing settings and write it.
     * cb(error). Inspects chrome.runtime.lastError.
     */
    function setSettings(partial, cb) {
        getSettings((readErr, current) => {
            if (readErr) {
                cb && cb(readErr);
                return;
            }
            const merged = Object.assign({}, current, partial || {});
            chrome.storage.local.set({ [STORAGE_KEYS.settings]: merged }, () => {
                const err = chrome.runtime.lastError || null;
                if (err) console.warn("storage write failed:", err.message);
                cb && cb(err);
            });
        });
    }

    /**
     * One-time, idempotent sync -> local migration.
     *
     * Logic:
     *   - If the local._migrated marker is set, do nothing.
     *   - Else read local.formData; if it is non-empty, set the marker and stop
     *     (never clobber existing local data).
     *   - Else read sync.formData; if present, copy it to local.formData.
     *   - In all paths, set local._migrated = true.
     *   - Tolerate sync read errors (log + continue, local stays empty).
     */
    function migrateSyncToLocal(cb) {
        chrome.storage.local.get([MIGRATED_MARKER, STORAGE_KEYS.formData], (localResult) => {
            const readErr = chrome.runtime.lastError || null;
            if (readErr) {
                // Bail out: if we can't trust the local read, proceeding could
                // clobber existing local data with sync data. Leave state as-is.
                console.warn("migration local read failed:", readErr.message);
                cb && cb(readErr);
                return;
            }

            if (localResult && localResult[MIGRATED_MARKER]) {
                cb && cb(null);
                return;
            }

            const localData = localResult && localResult[STORAGE_KEYS.formData];
            if (!gfafIsEmpty(localData)) {
                // Local already has data: don't touch it, just mark migrated.
                setMarker(cb);
                return;
            }

            // Local empty: try to pull from sync.
            let syncStore;
            try {
                syncStore = chrome.storage.sync;
            } catch (e) {
                syncStore = null;
            }
            if (!syncStore) {
                setMarker(cb);
                return;
            }

            syncStore.get(STORAGE_KEYS.formData, (syncResult) => {
                const syncErr = chrome.runtime.lastError || null;
                if (syncErr) {
                    console.warn("migration sync read failed:", syncErr.message);
                    setMarker(cb);
                    return;
                }

                const syncData = syncResult && syncResult[STORAGE_KEYS.formData];
                if (gfafIsEmpty(syncData)) {
                    setMarker(cb);
                    return;
                }

                chrome.storage.local.set({ [STORAGE_KEYS.formData]: syncData }, () => {
                    const writeErr = chrome.runtime.lastError || null;
                    if (writeErr) {
                        console.warn("migration copy failed:", writeErr.message);
                        cb && cb(writeErr);
                        return;
                    }
                    setMarker(cb);
                });
            });
        });

        function setMarker(done) {
            chrome.storage.local.set({ [MIGRATED_MARKER]: true }, () => {
                const err = chrome.runtime.lastError || null;
                if (err) console.warn("migration marker write failed:", err.message);
                done && done(err);
            });
        }
    }

    globalThis.GFAFStorage = {
        STORAGE_KEYS,
        DEFAULT_SETTINGS,
        getFormData,
        setFormData,
        getSettings,
        setSettings,
        migrateSyncToLocal
    };
})();
