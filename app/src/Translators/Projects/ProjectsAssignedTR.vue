<template lang="pug">
#projects-assigned-wrapper
    div(v-if="translation && translation.STATUS" style="padding-bottom: 0px; display: flex; border-bottom: thin solid rgba(34,36,38,.15); margin-bottom: 15px")
        div(style="flex-grow: 1; font-weight: 700; font-size: 1rem; padding-top: 13px" :style="{color: [3, 4].includes(translation.STATUS) ? '#cc3333' : 'black' }") {{ translationHeaderText }}
        .ui.coolblue.tiny.button(v-if="[1, 2].includes(translation.STATUS) && !translation.CONFIRMED && translation.CONFIRMED != undefined" @click="confirmAssignment" style="margin-left: 30px; margin-bottom: 5px" ) Confirm
        .ui.basic.tiny.button(v-if="[1, 2].includes(translation.STATUS) && translation.CONFIRMED" @click="showPurchaseOrder" style="margin-left: 30px; margin-bottom: 5px; background-color: white !important" ) View purchase order
        .ui.coolblue.tiny.button(v-if="[3, 4].includes(translation.STATUS)" @click="showUnassignReason" style="margin-left: 30px; margin-bottom: 5px" ) See reason
    ProjectsPurchaseOrder(:project="project" :subproject="subproject" :translation="translation")
    ProjectUploadQuality(ref="ProjectUploadQuality")
    ProjectUploadContents(ref="ProjectUploadContents")
    div(v-if="[1, 2].includes(translation.STATUS)" style="padding-bottom: 10px; font-weight: 600; color: #883333") Before starting to work on your {{ translation.STATUS === 1 ? "translation" : "proofreading" }}, please read carefully all the instructions below:
    #project-information(v-if="[1, 2].includes(translation.STATUS)")
        div(style="white-space: pre-wrap; padding: 10px" v-html="projectInformation")
        div#dummy-qa-help-button(style="display: none" @click="showQAHelp")
    .field(style="color: #D68910; font-weight: 600; cursor: pointer" @click="composeProjectMessage") If there is a problem with this project, please report it to the managers by clicking here.
    div(v-if="[1, 2].includes(translation.STATUS)")
        .ui.dividing.header(style="margin-top: 10px")
        .fields.inline
            .field
                .ui.button.coolgreen.tiny(@click="uploadTranslation") Upload your {{ translation.STATUS === 1 ? "translation" : "proofreading" }}
            .field
                TWCheckbox(label="Select this after you have uploaded all the files you had to work on" :obj="translation" :change="updateTranslation" field="UPLOADED_ALL_FILES")
        .ui.dividing.header(style="margin-top: 10px")
        .ui.tw-size.form.grid
            .ui.eight.wide.column
                .fields.inline(style="margin-bottom: 10px !important")
                    TWInput(readonly :obj="translation" field="TARGET_WORDS" placeholder="Target words" style="width: 90px")
                    .ui.button.teal.tiny(style="padding: 9px; margin-left: 10px" @click="editTargetWords") Edit&nbsp;your&nbsp;target&nbsp;words
                .fields.inline(style="margin-bottom: 10px !important")
                    TWInput(readonly :value="statusText" placeholder="Your status" style="width: 150px")
                    .ui.button.teal.tiny(style="padding: 9px; margin-left: 10px; width: 140px" @click="editStatus") Update&nbsp;your&nbsp;status
                .fields.inline(style="margin-bottom: 10px !important")
                    TWInput(readonly :obj="translation" field="COMMENTS" placeholder="Your comments" style="width: 150px")
                    .ui.button.teal.tiny(style="padding: 9px; margin-left: 10px; width: 140px" @click="editComments") Edit&nbsp;your&nbsp;comments
            .ui.eight.wide.column
                ProjectsWatchStatus(v-if="[1, 2].includes(translation.STATUS) && project.IS_PROGRESS_WATCHED && !projectIsCompleted" :translation="translation")
        h5.ui.dividing.header(style="font-size: 13px; font-weight: 600") Other translators working on this project
        .ui.tw-size.form.grid
            .ui.seven.wide.column
                ProjectsAssignedTranslators(:project="project" :subproject="subproject" )
            .ui.nine.wide.column
                .field(v-if="otherTranslatorUploadedAllFiles") The translator has uploaded all the files they had to translate.
                .field(style="margin-bottom: 10px !important") {{ otherComments.slice(0, 200) }}{{ otherComments.length > 200 ? "..." : ""}}
                    a(v-if="otherComments.length > 200" style="margin-left: 10px; cursor: pointer" @click="viewOtherComments") View more
    input#upload-input(type="file" multiple style="display: none" @change="processBrowseFiles")            
</template>

<script>
import ProjectsWatchStatus from "./ProjectsWatchStatusTR"
import ProjectsPurchaseOrder from "./ProjectsPurchaseOrderTR"
import ProjectUploadQuality from "./ProjectUploadQualityTR"
import ProjectUploadContents from "../../Shared/components/ProjectUploadContents"
import ProjectsAssignedTranslators from "./ProjectsAssignedTranslatorsTR"
import C_ from "../ConstantsTR"
import utils from "../UtilsTR"
import cmg from "../ConnectionManagerTR"
import store from "../Store/StoreTR"

export default {
    components: { ProjectsWatchStatus, ProjectsPurchaseOrder, ProjectsAssignedTranslators, ProjectUploadQuality, ProjectUploadContents },

    props: {
        project: Object,
        subproject: Object,
        translation: Object
    },

    destroyed() {
        $("#modal-purchase-order").remove()
        $("#modal-upload-quality").remove()
        $("#modal-upload-contents").remove()
    },

    computed: {
        translationHeaderText() {
            if (!this.translation || !this.translation.STATUS) return ""

            if ([C_.tsTranslating, C_.tsProofreading].includes(this.translation.STATUS)) {
                const translateProofread = [C_.tsTranslating, C_.tsUnassignedTranslation].includes(this.translation.STATUS) ? "translate" : "proofread"
                let result = `You ${this.project.STATUS === C_.psCancelled ? "were" : "are"} assigned to ${translateProofread} this project`
                if (!this.translation.CONFIRMED && this.translation.CONFIRMED != undefined) {
                    if (this.project.STATUS != C_.psCancelled) result += " — Please confirm your assignment"
                    if (this.project.STATUS === C_.psReopened) result = "Please confirm that you can work to correct this reopened project."
                }
                if (this.project.STATUS === C_.psCancelled) result += " — The project has been cancelled"
                return result
            }
            if ([C_.tsUnassignedTranslation, C_.tsUnassignedProofreading].includes(this.translation.STATUS)) {
                let result = `You have been unassigned from this project. Please don't work on it anymore.`
                return result
            }
        },

        projectIsCompleted() {
            return [C_.psCompleted, C_.psCompletedAfterReopen, C_.psCancelled].includes(this.project.STATUS)
        },

        projectInformation() {
            if (!this.translation) return ""
            let result = ""
            let intermediateLanguageInfo = ""
            if (this.subproject.INTERMEDIATE_LANGUAGE_ID) {
                if (this.translation.STATUS === C_.tsTranslating) {
                    if (store.myself.hasLanguagePair(this.project.SOURCE_LANGUAGE_ID, this.subproject.INTERMEDIATE_LANGUAGE_ID))
                        intermediateLanguageInfo = `Note that you have to translate the initial ${store.languageName(
                            this.project.SOURCE_LANGUAGE_ID
                        )} files into ${store.languageName(this.subproject.INTERMEDIATE_LANGUAGE_ID)}.`
                    else
                        intermediateLanguageInfo = `Note that you have to translate the ${store.languageName(
                            this.subproject.INTERMEDIATE_LANGUAGE_ID
                        )} files uploaded below into ${store.languageName(this.subproject.LANGUAGE_ID)}.`
                }
                if (this.translation.STATUS === C_.tsTranslating) {
                    intermediateLanguageInfo = `Note that you have to proofread only the ${store.languageName(this.subproject.LANGUAGE_ID)} files uploaded below.`
                }
            }

            if (intermediateLanguageInfo) result = `<p>${intermediateLanguageInfo}</p>`

            if (+this.project.CAT_TOOLS || this.project.CAT_TOOLS_OTHER)
                result +=
                    "<p>This project uses CAT tools. Please check the requirements above. Also, if you received a send package, please make sure that you created and uploaded a return package.</p>"
            else if (this.translation.STATUS === C_.tsProofreading) result += "<p>For proofreading, you have to use Track Changes to correct the file.</p>"

            if ((this.project.CAT_TOOLS || "")[1] == 1) result += `<p>This is a TagEditor project, therefore do not modify the names of the files you are working on.</p>`

            if ((this.project.CAT_TOOLS || "")[0] == 1 || (this.project.CAT_TOOLS || "")[3] == 1)
                result += `<p>For Trados projects, always upload back the Trados Memory (TM) with your files.</p>`

            if (this.project.NEEDS_QA_REPORT)
                result += `<p>This project has to be accompanied by a Quality Assurance report. Make sure to upload your QA report with your files. For more information on this, click here: <a href="#" onclick="document.getElementById('dummy-qa-help-button').click()">QA Help.</a></p>`

            if (this.translation.isAssigned())
                result +=
                    `<p>As a general rule for uploading your files, whenever possible, please try to upload a single zip file with all your work. The zip file's name should contain the project number and TR or PR at the end, depending on whether you are translating or proofreading the project.</p>` +
                    "<p>If you are uploading an unzipped file, it is mandatory to preserve the original file name and only add your language code and TR / PR at the end of the file name, separated by underline. For example, if the original file is named <em>Image1.png</em> and you have translated it into English, you should upload a file named <em>Image1_EN_TR.docx</em>.</p>"
            if (utils.isNotBlank(this.project.REOPEN_COMMENTS)) result += `<p style="font-weight: 600">Comments after reopen</p><p>${this.project.REOPEN_COMMENTS}</p>`

            // If the project is certified or notarized and it's not a template-editing project, add some special instructions
            if (this.project.IS_CERTIFIED || this.project.IS_NOTARIZED)
                if (!(this.project.SPECIAL_INSTRUCTIONS || "").includes("You will receive the link for editing the file"))
                    result +=
                        `<p><span style="font-weight: 600">Important!</span> This is a certified project. Please do NOT leave the original signatures and stamps in the target document, as that is illegal by US law. ` +
                        `Also, please read carefully the instructions found here: <a target="_blank" href="https://www.universal-translation-services.com/how-to-make-a-certified-translation/">https://www.universal-translation-services.com/how-to-make-a-certified-translation</a></p>` +
                        `<p>Please make sure to upload a doc and a PDF of your translation.</p>`

            if (utils.isNotBlank(this.project.CLIENT_INSTRUCTIONS_FOR_TRANSLATORS))
                result += `<p style="font-weight: 600">Client's general instructions</p><p>${this.project.CLIENT_INSTRUCTIONS_FOR_TRANSLATORS}</p>`

            if (utils.isNotBlank(this.project.SPECIAL_INSTRUCTIONS))
                result += `<p style="font-weight: 600">Additional instructions from the project manager</p><p>${this.project.SPECIAL_INSTRUCTIONS}</p>`

            return (result || "").replace(/<img.+>/gi, "")
        },

        otherTranslatorUploadedAllFiles() {
            if (this.translation.STATUS != C_.tsProofreading) return false

            for (let t of store.translations)
                if (t.SUBPROJECT_ID === this.subproject.PK && t.EMPLOYEE_ID != store.myself.PK && t.STATUS === C_.tsTranslating && t.UPLOADED_ALL_FILES) return true
        },

        otherComments() {
            let comments = ""
            for (let t of store.translations)
                if (t.SUBPROJECT_ID === this.subproject.PK && t.EMPLOYEE_ID != store.myself.PK && t.isAssigned() && t.COMMENTS) {
                    const employee = store.employee(t.EMPLOYEE_ID)
                    if (employee) comments += `${employee.fullName()} wrote:\n\n`
                    comments += t.COMMENTS + "\n\n"
                }
            return comments
        },

        statusText() {
            return this.translation.STATUS_TEXT === "<$A$>" ? "" : this.translation.STATUS_TEXT
        }
    },

    methods: {
        updateTranslation(field, value) {
            cmg.updateObject(this.translation, field, value)
        },

        async editTargetWords() {
            const response = await this.$showDialog({
                message: `Type the number of your target words for project ${this.project.PROJECT_NUMBER}:`,
                inputText: this.translation.TARGET_WORDS
            })
            if (response.selection === "OK" && parseInt(response.text, 10) == response.text) this.updateTranslation("TARGET_WORDS", parseInt(response.text, 10))
        },

        async editStatus() {
            const response = await this.$showDialog({
                message: `Edit your status for project ${this.project.PROJECT_NUMBER}:`,
                inputText: this.translation.STATUS_TEXT === "<$A$>" ? "" : this.translation.STATUS_TEXT
            })
            if (response.selection === "OK") this.updateTranslation("STATUS_TEXT", response.text || "")
        },

        async editComments() {
            const response = await this.$showDialog({
                message: `Edit your comments for project ${this.project.PROJECT_NUMBER}:`,
                textAreaText: this.translation.COMMENTS || "",
                caretPosition: (this.translation.COMMENTS || "").length
            })
            if (response.selection === "OK") this.updateTranslation("COMMENTS", "$SERVER_TIME$ - " + response.text)
        },

        viewOtherComments() {
            this.$showMessage(this.otherComments)
        },

        showPurchaseOrder() {
            utils.showModal("#modal-purchase-order")
        },

        showQAHelp() {
            this.$showHTMLMessage(C_.qaHelp)
        },

        confirmAssignment() {
            if (!this.translation || !this.translation.STATUS || this.translation.CONFIRMED) return
            cmg.updateObject(this.translation, "CONFIRMED", true)
        },

        showUnassignReason() {
            if (!this.translation) return
            this.$showMessage(`You have been unassigned from this project for the following reason:\n\n${this.translation.UNASSIGN_REASON}`)
        },

        composeProjectMessage() {
            this.$emit("composeProjectMessage")
        },

        async uploadTranslation() {
            if (!this.translation) return

            this.uploadFileType = null
            this.uploadFileContents = null
            this.uploadFileContentsOther = null

            let fileType = 0
            if (this.translation.STATUS === C_.tsTranslating || this.translation.STATUS === C_.tsUnassignedTranslation)
                fileType = [C_.psReopened, C_.psCompletedAfterReopen].includes(this.project.STATUS) ? C_.pfReopenedTranslated : C_.pfTranslated
            if (this.translation.STATUS === C_.tsProofreading || this.translation.STATUS === C_.tsUnassignedProofreading)
                fileType = [C_.psReopened, C_.psCompletedAfterReopen].includes(this.project.STATUS) ? C_.pfReopenedProofread : C_.pfProofread

            if (this.$checkWithMessage(fileType === 0, "You are not assigned to this project.")) return

            let message
            if ([C_.pfTranslated, C_.pfReopenedTranslated].includes(fileType))
                message =
                    "By uploading this file, you agree that you have run a spell-check on the file or files you are uploading. Spell-checking is a task for the translator too, not only for the proofreader. Not having a text spell-checked is harming our company (mainly by losing the customer) and it gives us problems with the payment of the invoice for this project.\n\nTherefore, not running a spell-check will result in a deduction of 25% from your payment.\n\nHave you run a spell-check on the file you are uploading?"

            if ([C_.pfProofread, C_.pfReopenedProofread].includes(fileType))
                message =
                    'By uploading this file, you agree that the file you are uploading:\n\n- has "Track Changes" turned on and\n- you have run a spell-check on it\n\nSpell-checking has to be done by both the translator and the proofreader. Sending out a document with spelling errors gives the company an unprofessional image and results in losing the customer who will not be paying the invoice for this project.\n\nTherefore, if you do not run a spell-check on this file, you are not going to be paid for this project.\n\nHave you run a spell-check on the file you are uploading?'

            if (!message) return

            if (!(await this.$dialogCheck(message))) return

            const comments = await this.$refs.ProjectUploadQuality.show()
            if (!comments) return

            if (this.project.NEEDS_QA_REPORT || this.project.hasCATTools()) {
                const contents = await this.$refs.ProjectUploadContents.show()
                if (!contents) return
                this.uploadFileContents = contents.contents
                this.uploadFileContentsOther = contents.other
            }

            this.uploadFileType = fileType
            this.uploadFileComments = comments

            $("#upload-input").click()
        },

        processBrowseFiles(event) {
            if (!this.uploadFileType) return
            const files = [...event.srcElement.files]

            files.forEach(file => {
                const fileInfo = {
                    table: "PROJECTS_FILES",
                    FILE_TYPE: this.uploadFileType,
                    PROJECT_ID: this.project.PK,
                    SUBPROJECT_ID: this.subproject.PK || 0,
                    COMMENTS: (this.uploadFileComments || "").slice(0, 10000),
                    CONTENTS: this.uploadFileContents || "",
                    CONTENTS_OTHER: (this.uploadFileContentsOther || "").slice(0, 1000)
                }

                const pendingFile = { FILE_TYPE: this.uploadFileType, FILE_NAME: file.name, SIZE: file.size, PROJECT_ID: this.project.PK, SUBPROJECT_ID: this.subproject.PK || 0 }
                store.pendingFileUploads.push(pendingFile)
                // uploadFile returns the XMLHttpRequest used to upload the file. Set it on the pending file, so we can call .abort() on it if needed
                pendingFile.xhr = this.$uploadFile(file, fileInfo, store.uploadTokens.PROJECTS, progress => {
                    this.$set(pendingFile, "uploadProgress", progress)
                })
            })

            // Clear the input, so it's ready for the next upload
            $("#upload-input").val("")
        }
    }
}
</script>

<style scoped>
#projects-assigned-wrapper {
    padding: 15px 20px 20px 20px;
    border-top: thin solid rgb(149, 159, 165);
    background-color: #f3fafd;
}

#project-information {
    margin-bottom: 10px;
    max-height: 210px;
    overflow-y: auto;
    background-color: white;
    border: thin solid #cad0d8;
}
</style>
