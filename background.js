chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === "googleautoformfillerPopup") {
        port.onDisconnect.addListener(function() {
           // Popup has been closed, save the data

        });
    }
});