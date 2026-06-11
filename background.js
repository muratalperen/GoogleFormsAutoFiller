// Save-on-close: the popup opens a "popupSession" port and streams its latest
// formData. We keep the last received snapshot in memory and flush it to
// chrome.storage.local when the port disconnects (popup closes). This is a
// belt-and-suspenders flush; the popup also writes directly on each change.
let latest = null;

chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "popupSession") return;

    port.onMessage.addListener((msg) => {
        if (msg && msg.type === "formData") {
            latest = msg.data;
        }
    });

    port.onDisconnect.addListener(() => {
        if (latest !== null) {
            chrome.storage.local.set({ formData: latest }, () => {
                void chrome.runtime.lastError;
            });
        }
        latest = null;
    });
});
