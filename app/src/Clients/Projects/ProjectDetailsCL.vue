<template lang="pug">
div
    .ui.large.form.project-details-wrapper
        h3.ui.header.violet(v-if="filesForTranslation.length") Project's files
        h5.ui.header(v-if="filesForTranslation.length" style="color: #1ea8c1") Files uploaded for translation
        table.ui.celled.table.files-table(v-if="filesForTranslation.length")
            tbody
                tr(v-for="file in filesForTranslation")
                    td {{ file.FILE_NAME }}
                    td(v-if="file.isDownloading" style="text-align: right; color: lightgrey") Downloading...
                    td.clickable(v-else style="text-align: right" @click="downloadFile(file)") Download file
        h5.ui.header.orange(v-if="filesForChecking.length") Files for checking
        table.ui.celled.table.files-table(v-if="filesForChecking.length")
            tbody
                tr(v-for="file in filesForChecking")
                    td {{ file.FILE_NAME }}
                    td.clickable(v-if="file.FILE_TYPE === 4 && file.ONLINE_EDITOR_LINK" @click="openFileInEditor(file)" style="text-align: right") Go to online editor
                    td.clickable(v-else-if="file.FILE_TYPE === 4 && !file.ONLINE_EDITOR_LINK" style="text-align: right")
                        div(v-if="!file.isApproved && !file.uploadStatus" style="display: flex; padding-bottom: 10px")
                            div(style="flex-grow: 1")
                            div(v-if="file.isDownloading" style="color: lightgrey") Downloading...
                            div.clickable(v-else @click="downloadFile(file)") Download file
                            div(style="padding: 0 10px") &#8226;
                            div.clickable(@click="approveTranslation(file)") Approve translation
                        div.clickable(v-if="!file.isApproved && !file.uploadStatus" @click="uploadFileChanges(file)") Upload your file with changes
                        div(v-if="!file.isApproved && !file.uploadStatus" style="font-size: 12px; color: orange; padding-top: 5px; white-space: nowrap") * if you upload a document (max. 10 MB), <br />you automatically approve the file with changes
                        div(v-if="file.isApproved" style="color: green; white-space: nowrap") Thank you for your approval!<br />We will get back to you soon.
                        div(v-if="file.uploadStatus") {{ file.uploadStatus }}
                        input(type="file" id="project-file-input" style="display: none;" @change="doUploadProjectFile")
                    td.clickable(v-else) 
        h5.ui.header.green(v-if="finalFiles.length") Your translated files
        table.ui.celled.table.files-table(v-if="finalFiles.length")
            tbody
                tr(v-for="file in finalFiles")
                    td {{ file.FILE_NAME }}
                    td(v-if="file.isDownloading" style="text-align: right; color: lightgrey") Downloading...
                    td.clickable(v-else @click="downloadFile(file)" style="text-align: right") Download file
        h5.ui.header.green(v-if="certifiedFiles.length") Your certified files
        table.ui.celled.table.files-table(v-if="certifiedFiles.length")
            tbody
                tr(v-for="file in certifiedFiles")
                    td {{ file.FILE_NAME }}
                    td
                        div(v-if="file.isDownloading" style="text-align: right; padding-bottom: 10px; color: lightgrey") Downloading...
                        .clickable(v-else @click="downloadFile(file)" style="text-align: right; padding-bottom: 10px") Download file
                        div(v-if="file.isDownloadingCertificate" style="text-align: right; padding-bottom: 10px; color: lightgrey") Downloading certificate...
                        .clickable(v-else @click="downloadCertificateOfEvidence(file)" style="text-align: right") Download certificate of evidence
        h3.ui.header.violet Messages about this project
        .field(v-if="!project.messages || !project.messages.length") We have no messages for you about this project
        .field.project-message-wrapper(v-for="message in project.messages") {{ message }}
        .fields
            .field
                .ui.small.button(@click="sendMessage" style="background-color: #1EA8C1; color: white") Send a message to our team
            .field(style="padding-top: 5px; color: green") {{ messageSentConfirmation }}
    #modal-send-message.ui.small.modal
        .header Send a message to our team
        .content
            .ui.form
                .field
                    textarea(rows="6" v-model="message" placeholder="Type your message here")
        .actions
            .ui.cancel.button Cancel
            .ui.positive.button(@click="doSendMessage") Send message
</template>

<script>
import utils from "../UtilsCL"

export default {
    props: {
        project: Object,
        store: Object
    },

    data() {
        return {
            message: "",
            messageSentConfirmation: "",
            projectFileForWhichToUpload: {}
        }
    },

    created() {
        this.utils = utils
    },

    computed: {
        filesForTranslation() {
            return this.project.files.filter(file => file.FILE_TYPE === 1)
        },

        filesForChecking() {
            return this.project.files.filter(file => file.FILE_TYPE === 4 && file.CLIENT_APPROVAL_STATUS === 1)
        },

        finalFiles() {
            return this.project.files.filter(file => [5, 10].includes(file.FILE_TYPE))
        },

        certifiedFiles() {
            return this.project.files.filter(file => file.FILE_TYPE === 16)
        }
    },

    methods: {
        openFileInEditor(file) {
            utils.openURL(file.ONLINE_EDITOR_LINK)
        },

        sendMessage() {
            this.message = ""
            this.messageSentConfirmation = ""
            $("#modal-send-message").modal("show")
        },

        approveTranslation(file) {
            if (!file || !file.PK) return
            this.store
                .axios({
                    url: this.store.apiURL + "ApproveProjectFile?c=" + this.store.code + "&f=" + file.PK + "&s=" + file.CODE,
                    method: "GET",
                    responseType: "blob"
                })
                .then(response => {})
                .catch(() => {})
            this.$set(file, "isApproved", true)
        },

        doSendMessage() {
            if (!this.message) return
            this.store
                .axios({
                    url: this.store.apiURL + "SendProjectMessage",
                    method: "post",
                    data: {
                        c: this.store.code,
                        p: this.project.PK,
                        m: this.message
                    }
                })
                .then(response => {})
                .catch(() => {})
            this.messageSentConfirmation = "Message sent"
        },

        downloadFile(file) {
            if (!file || !file.PK) return
            this.$set(file, "isDownloading", true)
            this.store
                .axios({
                    url: this.store.apiURL + "DownloadProjectFile?c=" + this.store.code + "&f=" + file.PK + "&s=" + file.CODE,
                    method: "GET",
                    responseType: "blob"
                })
                .then(response => {
                    if (response.status != 200) return
                    const url = window.URL.createObjectURL(new Blob([response.data]))
                    const link = document.createElement("a")
                    link.href = url
                    link.setAttribute("download", file.FILE_NAME)
                    document.body.appendChild(link)
                    link.click()
                })
                .catch(() => {})
        },

        downloadCertificateOfEvidence(file) {
            if (!file || !file.PK) return
            this.$set(file, "isDownloadingCertificate", true)
            this.store
                .axios({
                    url: this.store.apiURL + "DownloadCertificateOfEvidence?c=" + this.store.code + "&f=" + file.PK + "&s=" + file.CODE,
                    method: "GET",
                    responseType: "blob"
                })
                .then(response => {
                    if (response.status != 200) return
                    const url = window.URL.createObjectURL(new Blob([response.data]))
                    const link = document.createElement("a")
                    link.href = url
                    link.setAttribute("download", `CertificateOfEvidence-${this.project.NUMBER}-us${file.PK}.pdf`)
                    document.body.appendChild(link)
                    link.click()
                })
                .catch(() => {})
        },

        // This function receives the projectFile for which the client wants to upload a corrected file
        // The information from projectFile is sent to the server, so the server knows for which existing
        // projectFile the new uploaded file is for
        doUploadProjectFile(event) {
            const files = [...event.srcElement.files]
            const file = files[0]
            if (!file) return

            const projectFile = this.projectFileForWhichToUpload
            if (!projectFile.PK) return

            const fileInfo = {
                c: this.store.code,
                f: projectFile.PK,
                s: projectFile.CODE
            }

            const formData = new FormData()
            formData.append("FileInfo", JSON.stringify(fileInfo))
            formData.append("File", file)

            const xhr = new XMLHttpRequest()
            xhr.upload.addEventListener(
                "progress",
                evt => {
                    if (!evt.lengthComputable) return
                    const percentComplete = Math.round((evt.loaded / evt.total) * 100)
                    if (percentComplete >= 100) this.$set(projectFile, "uploadStatus", "Upload complete. We will get back to you soon.")
                    else this.$set(projectFile, "uploadStatus", `Uploading... ${percentComplete}% done`)
                },
                false
            )

            xhr.open("POST", this.store.apiURL + "UploadFile", true)
            xhr.send(formData)

            $("#project-file-input").val("")
        },

        uploadFileChanges(file) {
            this.projectFileForWhichToUpload = file
            $("#project-file-input").click()
        }
    }
}
</script>

<style scoped>
.project-details-wrapper {
    padding-top: 20px;
}

.project-message-wrapper {
    border: thin solid rgb(166, 149, 202);
    border-radius: 2px;
    background-color: rgb(249, 245, 255);
    padding: 10px;
    white-space: pre-wrap;
    margin-bottom: 10px;
    font-size: 13px;
}

h3.ui.header {
    background-color: #1ea8c1;
    color: white !important;
    margin: 20px -15px;
    padding: 12px;
}

.files-table {
    font-size: 13px;
}
</style>
