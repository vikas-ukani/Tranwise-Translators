<template lang="pug">
#transfer-manager-modal.ui.tiny.modal.persistent
    //- This visual part is not used anymore, only the code below.
    .header Transfer manager
    i.close.icon
    .content
</template>

<script>
import Vue from "vue"
import store from "../StoreBase"

// Create a new Vue instance that is going to be used as an event bus
Vue.prototype.$transferManager = new Vue()

// Add a global method to the Vue instance, so we can use this.$downloadFile anywhere in the app
Vue.prototype.$downloadFile = function (fileInfo, saveFolder, progressCallback) {
    this.$transferManager.$emit("tranwise-download-file", fileInfo, saveFolder, progressCallback)
}

// Add a global method to the Vue instance, so we can use this.$uploadFile anywhere in the app
Vue.prototype.$uploadFile = function (file, fileInfo, uploadToken, progressCallback) {
    file.xhr = new XMLHttpRequest()
    this.$transferManager.$emit("tranwise-upload-file", file, fileInfo, uploadToken, progressCallback)
    return file.xhr
}

export default {
    data() {
        return {
            transfers: []
        }
    },

    methods: {
        uploadFile(file, fileInfo, uploadToken, progressCallback) {
            // If the file is empty, don't upload it
            if (file.size <= 0) {
                this.$showMessage(`This file is empty and it wasn't uploaded to the server.\n\n${file.name}`)
                return
            }

            const formData = new FormData()
            // The file information has to be appended before the actual file,
            // as the server discards the file if the file information is not correct
            formData.append("FileInfo", JSON.stringify(fileInfo))
            formData.append("File", file)
            const xhr = file.xhr
            xhr.upload.addEventListener(
                "progress",
                evt => {
                    if (!evt.lengthComputable) return
                    const percentComplete = Math.round((evt.loaded / evt.total) * 100)
                    // Call the progressCallback with the percent completed or, if zero (when it just started), call with 1%,
                    // so that the progress bar is shown
                    if (typeof progressCallback === "function") progressCallback(percentComplete || 1)
                },
                false
            )
            xhr.open("POST", location.protocol + "//" + process.env.SOCKET_ADDRESS + "/upfi/" + uploadToken, true)
            xhr.send(formData)

            this.transfers.push("Upload")
        },

        downloadFile(fileInfo, saveFolder, progressCallback) {
            this.transfers.push("Download")
            const filename = fileInfo.FILE_NAME
            const xhr = new XMLHttpRequest()
            Vue.set(fileInfo, "downloadProgress", 1)

            fileInfo.token = store.downloadToken

            xhr.open("POST", location.protocol + "//" + process.env.SOCKET_ADDRESS + "/dofi/", true)
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8")
            xhr.addEventListener(
                "progress",
                function (evt) {
                    let percentComplete = 1
                    if (evt.lengthComputable) percentComplete = Math.round((evt.loaded / evt.total) * 100)
                    else if (evt.loaded === fileInfo.SIZE) percentComplete = 100

                    // Call the progressCallback with the percent completed or, if zero (when it just started), call with 1%,
                    // so that the progress bar is shown
                    if (typeof progressCallback === "function") progressCallback(percentComplete || 1)
                    // else, if we didn't get a progress callback, just set the downloadProgress on the file
                    else Vue.set(fileInfo, "downloadProgress", percentComplete || 1)
                },
                false
            )
            xhr.responseType = "blob"
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4 && xhr.status === 288) {
                    this.$showMessage(`The requested file was not found on the server.\n\n${filename}`)
                }
                if (xhr.readyState === 4 && xhr.status === 289) {
                    this.$showMessage(`There was an error when downloading the following file. Please try again later.\n\n${filename}`)
                }
                if (xhr.readyState === 4 && xhr.status === 290) {
                    this.$showMessage(`There was an error when downloading the following file.\n\n${filename}`)
                }
                if (xhr.readyState === 4 && xhr.status === 200) {
                    Vue.set(fileInfo, "downloadProgress", 100)
                    if (typeof window.chrome !== "undefined") {
                        // Chrome version
                        const link = document.createElement("a")
                        link.href = window.URL.createObjectURL(xhr.response)
                        link.download = filename

                        // Send a message to the Tranwise extension to let it know where to save the file
                        const blobID = link.href.split("/").pop()

                        const extensionID = localStorage.TranwiseExtensionID
                        if (extensionID) {
                            if (saveFolder.includes("IsForDownloadAllFiles")) {
                                chrome.runtime.sendMessage(extensionID, { folder: saveFolder.replace("IsForDownloadAllFiles", ""), blobID })
                                link.click()
                            } else if (store.Preferences("askForDownloads")) {
                                chrome.runtime.sendMessage(extensionID, { askForLocation: true, filename, blobID, url: link.href })
                            } else {
                                chrome.runtime.sendMessage(extensionID, { folder: saveFolder, blobID, shouldOpen: fileInfo.shouldOpen })
                                link.click()
                            }
                        } else link.click()
                    } else if (typeof window.navigator.msSaveBlob !== "undefined") {
                        // IE version
                        const blob = new Blob([xhr.response], { type: "application/force-download" })
                        window.navigator.msSaveBlob(blob, filename)
                    } else {
                        // Firefox version
                        const file = new File([xhr.response], filename, { type: "application/force-download" })
                        window.open(URL.createObjectURL(file))
                    }
                }
            }
            xhr.send(JSON.stringify(fileInfo))
        },

        show() {
            $("#transfer-manager-modal")
                .modal({
                    duration: 200,
                    allowMultiple: true,
                    closable: true,
                    transition: "fade up",
                    dimmerSettings: { opacity: 0.2 }
                })
                .modal("show")
        }
    },

    created() {
        this.$transferManager.$on("tranwise-upload-file", (file, fileInfo, uploadToken, progressCallback) => {
            this.uploadFile(file, fileInfo, uploadToken, progressCallback)
        })

        this.$transferManager.$on("tranwise-download-file", (fileInfo, saveFolder, progressCallback) => {
            this.downloadFile(fileInfo, saveFolder, progressCallback)
        })

        store.eventBus.$on("downloadRequestedFile", fileInfo => {
            this.downloadFile(fileInfo, "Requested files")
        })
    }
}
</script>

<style scoped></style>
