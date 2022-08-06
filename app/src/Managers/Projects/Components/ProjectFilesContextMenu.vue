<template lang="pug">
    TWContextMenu(ref="fileContextMenu")
        .menu#projects-files-context-menu(slot="menu-items")
            .item(@click="downloadAllFiles") Download all files
            .divider
            .item(@click="copyFileName") Copy file name
            .item(v-if="file && (file.CONTENTS || '').startsWith('OCR-')" @click="copyWordCount") Copy word count
            .divider
            .item(v-if="store.myself.NAME_CODE && project.WORKING_MANAGER_ID != store.myself.PK" @click="markMeAsWorking") Mark me as working on project
            .divider(v-if="store.myself.NAME_CODE && project.WORKING_MANAGER_ID != store.myself.PK" )
            .item(v-if="canSendFileToClient" @click="sendFileToClient") Send file to client
            .item(v-if="canSendFileToClient" @click="sendFileToClientAlternateEmail") Send file to alternate email address
            .item(v-if="canUploadAsFinalFile" @click="uploadAsFinalFile") Upload as final file
            .divider(v-if="canAskClientToCheckTranslation || fileIsEditedOnline")
            .item(v-if="canAskClientToCheckTranslation" @click="sendFileToCheck") Ask client to check translation
            .item(v-if="fileIsEditedOnline" @click="openFileInOnlineEditor") Open file in online editor
            .item(v-if="fileIsEditedOnline && file.CONTENTS_OTHER != 'TEMPLATE_FILE'" @click="downloadOnlineEditedFile") Download online edited file
            .item(v-if="fileIsEditedOnline && file.CONTENTS_OTHER != 'TEMPLATE_FILE'" @click="unlockFileForOnlineEditing") Unlock file for online editing
            .item(v-if="fileIsEditedOnline && file.CONTENTS_OTHER != 'TEMPLATE_FILE'" @click="sendFileToTranslators") Send online editor link to translator
            .divider(v-if="canAskClientToCheckTranslation || fileIsEditedOnline")
            .item(v-if="canDownloadFilesForNotarization" @click="downloadFilesForNotarization") Download files for notarization
            .item(v-if="canClaimCertification" @click="claimCertification") Claim certification
            .item(v-if="canSendFileToOCR" @click="sendFileToOCR") Send file to OCR
            .item(v-if="fileIsDigitalCertification" @click="resendDigitalCertification") Resend digital certification
            .item(v-if="fileIsDigitalNotarization" @click="resendDigitalCertification") Resend digital notarization
            .item(v-if="fileIsDigitalCertification" @click="downloadCertificateOfEvidence") Download certificate of evidence
            .item(@click="deleteFile") Delete file
            .divider
            .item(@click="chatWithUploader") Chat with uploader
            .item(@click="sendMessageToUploader") Send message to uploader
            .item(@click="goToUploaderDetails") Go to uploader's details
            .item(v-if="showSendAI" @click="goToUploadAI") Send File To AI Translate

</template>

<script>
import { store, utils, cmg, constants as C_ } from "../../CoreModules"

const ocrableExtensions = ["bmp", "dcx", "pcx", "png", "jp2", "jpc", "jpg", "jpeg", "jfif", "pdf", "tif", "tiff", "gif", "djvu", "djv", "jb2"]

export default {
    props: {
        project: Object,
        file: Object
    },

    created() {
        this.store = store
    },

    computed: {
        canSendFileToClient() {
            // if (this.project.WEBSITE_ORDER_ID) return false
            return this.file && [C_.pfFinal, C_.pfFinalSent, C_.pfReopenedFinal, C_.pfReopenedFinalSent].includes(this.file.FILE_TYPE)
        },

        canAskClientToCheckTranslation() {
            return this.file && this.file.FILE_TYPE === C_.pfFinal && this.project.isNotarizedOrCertified() && this.file.CONTENTS === "NOT_NC"
        },

        canUploadAsFinalFile() {
            if (!this.file) return false
            return (
                (this.file.FILE_TYPE === C_.pfTranslated && this.project.PROJECT_TYPE === C_.ptTranslate) ||
                (this.file.FILE_TYPE === C_.pfProofread && this.project.PROJECT_TYPE != C_.ptTranslate)
            )
        },

        canDownloadFilesForNotarization() {
            return this.project.IS_CERTIFIED
        },

        canClaimCertification() {
            return this.file && [C_.pfFinal, C_.pfFinalSent].includes(this.file.FILE_TYPE) && this.project.IS_CERTIFIED
        },

        canSendFileToOCR() {
            return this.file && this.file.FILE_TYPE === C_.pfMain && ocrableExtensions.includes(this.file.FILE_NAME.split(".").pop())
        },

        fileIsEditedOnline() {
            return this.file && this.file.ONLINE_EDITOR_LINK && this.file.ONLINE_EDITOR_LINK != "LINK"
        },

        fileIsDigitalCertification() {
            return this.file && this.file.FILE_TYPE === C_.pfDigitalCertification
        },

        fileIsDigitalNotarization() {
            return this.file && this.file.FILE_TYPE === C_.pfDigitalNotarization
        },
        showSendAI(){
            return this.file && this.file.FILE_TYPE === 1 && this.project.AI_TRANSLATION_STATUS ;
        },
    },

    methods: {
        show(event) {
            this.$refs.fileContextMenu.show(event)
            if (window.getSelection) window.getSelection().removeAllRanges()
        },

        copyFileName() {
            utils.copyToClipboard(this.file.FILE_NAME)
        },

        copyWordCount() {
            const wordCount = this.file && (this.file.CONTENTS || "").startsWith("OCR-") ? this.file.CONTENTS.slice(4) : ""
            if (wordCount) utils.copyToClipboard(wordCount)
        },

        markMeAsWorking() {
            if (this.project.WORKING_MANAGER_ID === store.myself.PK) return
            if (!store.myself.NAME_CODE) return

            cmg.updateObject(this.project, "WORKING_MANAGER_ID", store.myself.PK)
            this.project.askedAboutWorkingOnProject = true
        },

        downloadAllFiles() {
            this.$emit("downloadAllFiles")
        },

        sendFileToClient() {
            this.doSendFileToClient(false)
        },

        sendFileToClientAlternateEmail() {
            this.doSendFileToClient(true)
        },

        async resendDigitalCertification() {
            const response = await this.$showDialog({
                message: "Type the email address to send the digital certification to:",
                inputText: this.project.PROJECT_EMAIL,
                buttons: ["Cancel", "Send digital certification"],
                buttonClasses: ["", "positive"]
            })
            if (response.selection != "Send digital certification") return

            cmg.sendMessage(cmg.messageHeaders.RESEND_DIGITAL_CERTIFICATION_OR_NOTARIZATION, this.file.PK, response.text)
        },

        async resendDigitalNotarization() {
            const response = await this.$showDialog({
                message: "Type the email address to send the digital notarization to:",
                inputText: this.project.PROJECT_EMAIL,
                buttons: ["Cancel", "Send digital notarization"],
                buttonClasses: ["", "positive"]
            })
            if (response.selection != "Send digital notarization") return

            cmg.sendMessage(cmg.messageHeaders.RESEND_DIGITAL_CERTIFICATION_OR_NOTARIZATION, this.file.PK, response.text)
        },

        downloadCertificateOfEvidence() {
            // Create a dummy file record that is sent with the download request
            const file = {
                table: "REQUESTED_FILES",
                FILE_NAME: `CertificateOfEvidence-${this.project.PROJECT_NUMBER}-us${this.file.PK}.pdf`
            }
            this.$downloadFile(file, "Requested files")
        },

        async doSendFileToClient(askForEmail) {
            const isReopened = this.project.STATUS === C_.psReopened

            let email = this.project.PROJECT_EMAIL

            if (this.$checkWithMessage(!utils.isValidEmail(email) && !askForEmail, "This project does not have a valid email set. Please correct this before sending the file."))
                return

            // If the project is reopened, don't allow sending without filling something in REOPEN_REPONSE
            if (
                this.$checkWithMessage(
                    isReopened && !this.project.REOPEN_RESPONSE.trim(),
                    'This is a reopened project and there are no comments for the client about the reopening. Please fill some comments on the Reopened page (in the "Response for client" field) before sending the file.'
                )
            )
                return

            // If the project is notarized or certified, ask for confirmation
            if (this.project.notarizedAndCertifiedText() && this.file.CONTENTS != "NC") {
                const r = await this.$dialogCheck(
                    `This is a ${this.project.notarizedAndCertifiedText()} project and this file doesn't seem to include the ${this.project.notarizedAndCertifiedText()} documents.\n\nWhen the file was uploaded, Tranwise has sent an automatic email to the client asking them to check the file.\n\nAre you sure you want to send this file to the client?`
                )
                if (!r) return
            }

            // Show the special instructions of the client and ask confirmation
            const specialInstructions = this.project.client().SPECIAL_INSTRUCTIONS.trim()
            if (specialInstructions) {
                const r = await this.$dialogCheck(`This client has special instructions for us. Are you sure you want to send the file?\n\n${specialInstructions}`)
                if (!r) return
            }

            // If we came here from Send file to alternate email, ask for the email address
            if (askForEmail) {
                // If we showed the special instructions confirmation, wait for it to close
                if (specialInstructions) await utils.delay(200)

                const response = await this.$showDialog({
                    message: `Type the email address to send the file to:`,
                    inputText: "",
                    buttons: ["Cancel", "Send file"],
                    buttonClasses: ["", "positive"]
                })

                if (response.selection != "Send file") return
                email = response.text
            }

            if (isReopened) {
                cmg.updateObject(this.file, "FILE_TYPE", C_.pfReopenedFinalSent)
                cmg.sendMessage(cmg.messageHeaders.SEND_REOPENED_PROJECT_FILE, this.file.PK, email)
            } else {
                cmg.updateObject(this.file, "FILE_TYPE", C_.pfFinalSent)
                cmg.sendMessage(cmg.messageHeaders.SEND_PROJECT_FINAL_FILE, this.file.PK, email)
            }

            store.addToProjectsHistory(this.project, C_.phSendFinalFile)
        },

        sendFileToCheck() {
            cmg.sendMessage(cmg.messageHeaders.SEND_TRANSLATED_FILE_FOR_CHECK, this.file.PK)
            store.addToProjectsHistory(
                this.project,
                this.file.ONLINE_EDITOR_LINK && !this.project.TWILIO_STATUS ? C_.phSendFileToCheckInOnlineEditor : C_.phSendFileToCheckOldMethod,
                this.file.FILE_NAME
            )
        },

        openFileInOnlineEditor() {
            utils.openURL(this.file.ONLINE_EDITOR_LINK.replace("-editor.html", "-editor-review.html"))
            cmg.updateObject(this.file, "ONLINE_CHECKED_BY", store.myself.PK)
        },

        downloadOnlineEditedFile() {
            const link = this.file.ONLINE_EDITOR_LINK
            if (this.$checkWithMessage(!link || link === "LINK", "This file wasn't edited online or there was an error downloading it.")) return
            utils.openURL("https://edit.tranwise.com/projects/download/" + link.substring(link.indexOf("file=") + 5))
        },

        async sendFileToTranslators() {
            const link = this.file.ONLINE_EDITOR_LINK
            if (this.$checkWithMessage(!link || link === "LINK", "This file wasn't edited online or there was an error downloading it.")) return

            const response = await this.$showDialog({
                header: "Send online editor link to translator and / or proofreader",
                message: "Send a message to the translator and / or proofreader with the option to view the file in the online editor:",
                textAreaText: `Dear translator,\n\nThe client had changes to the translated file for project ${
                    this.project.PROJECT_NUMBER
                }. Please find below the link to the file that was edited in the online editor:\n\n${link.replace("-editor.html", "-editor-review.html")}`,
                buttons: ["Cancel", "Send message"],
                buttonClasses: ["", "positive"]
            })

            if (response.selection != "Send message") return

            // Send the message to all the assigned translators and proofreaders
            this.project.assignedTranslations().forEach(translation => {
                const employee = translation.employee()
                store.sendEmployeeMessage(employee, response.text)
            })
        },

        unlockFileForOnlineEditing() {
            const link = this.file.ONLINE_EDITOR_LINK
            if (this.$checkWithMessage(!link || link === "LINK", "This file wasn't edited online or there was an error downloading it.")) return
            cmg.sendMessage(cmg.messageHeaders.UNLOCK_FILE_IN_ONLINE_EDITOR, this.project.PK, this.file.PK)
        },

        downloadFilesForNotarization() {
            cmg.requestFilesForNotarizedProject(this.project.PK)
        },

        uploadAsFinalFile() {
            this.$emit("uploadAsFinalFile", this.file)
        },

        async claimCertification() {
            if (this.project.CLAIMED_BY) {
                const employee = store.employee(this.project.CLAIMED_BY)
                this.$showMessage(`The certification for this project has already been claimed by ${employee ? employee.fullName() : "someone else"}.`)
                return
            }

            if (!(await this.$dialogCheck(`Are you sure you want to claim the certification for project ${this.project.PROJECT_NUMBER}?`))) return

            cmg.updateObject(this.project, "CLAIMED_BY", store.myself.PK)
        },

        async deleteFile() {
            if (!(await this.$dialogCheck(`Are you sure you want to delete this ${C_.projectFilesStringTypes[this.file.FILE_TYPE]} file?\n\n${this.file.FILE_NAME}`))) return
            cmg.deleteObject(this.file)
        },

        sendFileToOCR() {
            cmg.sendMessage(cmg.messageHeaders.OCR_FILE, this.file.PK, this.project.PK, store.myself.PK, this.file.FILE_NAME)
        },

        chatWithUploader() {
            store.chatWithEmployee(this.file.employee())
        },

        sendMessageToUploader() {
            store.composeAndSendEmployeeMessage(this.file.employee())
        },

        async goToUploaderDetails() {
            await utils.delay(10) // Waits for the popup menu to close before switching the screen
            store.goToObject(this.file.employee())
        },
        goToUploadAI() {
            cmg.sendMessage(cmg.messageHeaders.CONVERT_FILE_TO_AI, this.file.PK, this.project.PK, store.myself.PK, this.file.FILE_NAME)
        }
    }
}
</script>

<style scoped>
#projects-files-context-menu > .divider {
    margin: 0 !important;
}

#projects-files-context-menu > .item {
    font-size: 12px;
    padding: 8px 20px !important;
}
</style>
