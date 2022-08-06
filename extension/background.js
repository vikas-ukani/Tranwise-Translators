chrome.downloads.onDeterminingFilename.addListener(function (item, __suggest) {
    function suggest(filename, conflictAction) {
        __suggest({
            filename: filename,
            conflictAction: conflictAction,
            conflict_action: conflictAction
        })
    }

    if (item.mime.includes("text/tranwise")) {
        suggest(item.mime.slice(13).toUpperCase())
        return
    }

    const blobID = item.url.split("/").pop()
    const folder = localStorage["TranwiseDownloadFolder" + blobID]
    const saveFileName = localStorage["TranwiseSaveFileName" + blobID]

    if (blobIDsToOpen.includes(blobID)) {
        downloadIDsToOpen.push(item.id)
        blobIDsToOpen.splice(blobIDsToOpen.indexOf(blobID), 1)
    }

    if (saveFileName) {
        localStorage.removeItem("TranwiseSaveFileName" + blobID)
        suggest(saveFileName)
        return
    }

    if (folder) {
        localStorage.removeItem("TranwiseDownloadFolder" + blobID)
        suggest("Tranwise/" + folder + "/" + item.filename)
        return
    }

    return false
})

let idForProjectDownload

const blobIDsToOpen = []
const downloadIDsToOpen = []

chrome.runtime.onMessageExternal.addListener(function (request) {
    if (request.shouldOpen) blobIDsToOpen.push(request.blobID)

    if (request.downloadAllFilesAndAskForLocation) {
        idForProjectDownload = null
        const url = URL.createObjectURL(new Blob([], { type: "text/tranwise" + request.projectNumber }))
        chrome.downloads.download({ url: url, saveAs: true }, id => (idForProjectDownload = id))
        return
    }

    if (request.askForLocation) {
        localStorage["TranwiseSaveFileName" + request.blobID] = request.filename
        chrome.downloads.download({ url: request.url, saveAs: true })
        return
    }

    localStorage["TranwiseDownloadFolder" + request.blobID] = request.folder
})

chrome.downloads.onChanged.addListener(changes => {
    if (changes.error && changes.error.current === "USER_CANCELED" && changes.id === idForProjectDownload) {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => chrome.tabs.sendMessage(tabs[0].id, { pathForProjectDownload: "CANCEL" }))
        return
    }

    if (changes.state && changes.state.current === "complete" && downloadIDsToOpen.includes(changes.id)) {
        downloadIDsToOpen.splice(downloadIDsToOpen.indexOf(changes.id), 1)
        chrome.downloads.open(changes.id)
    }

    if (changes.filename && changes.filename.current && changes.id === idForProjectDownload) {
        idForProjectDownload = null

        chrome.tabs.query({ active: true, currentWindow: true }, tabs => chrome.tabs.sendMessage(tabs[0].id, { pathForProjectDownload: changes.filename.current }))

        chrome.downloads.cancel(changes.id)
        chrome.downloads.erase({ id: changes.id })
    }
})

// Computer idle detection
let idleState = ""
chrome.idle.setDetectionInterval(600)
chrome.idle.onStateChanged.addListener(newState => (idleState = newState))
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => request.message == "getIdleState" && sendResponse(idleState))
