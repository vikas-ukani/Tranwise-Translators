localStorage.TranwiseExtensionID = chrome.runtime.id
setInterval(() => chrome.runtime.sendMessage({ message: "getIdleState" }, idleState => (localStorage.TranwiseIdleState = idleState)), 5000)

chrome.runtime.onMessage.addListener(request => {
    if (request.pathForProjectDownload) {
        const div = document.getElementById("current-project-download-path")
        if (div) div.textContent = request.pathForProjectDownload
    }
})
