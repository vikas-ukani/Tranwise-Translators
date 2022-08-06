<template lang="pug">
div(style="height: 100%; display: flex; flex-direction: column")
    .fields.inline(v-if="!$attrs.hideFilter" style="margin-bottom: 0.3em !important")
        .field
            label Filter&nbsp;files:
        .field(style="padding-right: 20px")
            TWCheckbox(checked ref="filterMain" label="MAIN" :change="filterFiles")
        .field(style="padding-right: 20px")
            TWCheckbox(checked ref="filterTranslated" label="TRANSLATED" :change="filterFiles")
        .field(style="padding-right: 20px")
            TWCheckbox(checked ref="filterProofread" label="PROOFREAD" :change="filterFiles")
        .field(style="padding-right: 20px")
            TWCheckbox(checked ref="filterFinal" label="FINAL" :change="filterFiles")
        .field(style="padding-right: 20px")
            TWCheckbox(checked ref="filterAdditional" label="ADDITIONAL" :change="filterFiles")
        .field(style="width: 100%; padding-right: 0")
            TWDropdown(defaultText="All languages" :items="targetLanguages" :change="filterFilesByLanguage" itemKey="LANGUAGE")
    #files-wrapper(style="flex: 1 1 auto")
        #no-files-placeholder(v-if="!files.length && !pendingFiles.length" style="min-height: 100px") {{ project.VIDEO_INTERPRETING_STATUS ? "This is a video interpreting project." : "" }} No files to show
        ScrollableTable(v-else style="border-radius: 5px 5px 0 0")
            tbody.tw-scrollable-table-body-no-head(slot="tbody")
                tr(v-for="file in files" style="font-size: 12px")
                    td.center.aligned.file-type(style="width: 115px; min-width: 115px; max-width: 115px; padding: 0" :style="{'background-color': fileTypeColor(file)}") {{ fileTypeString(file) }}
                    td(style="width: 80px; min-width: 80px; max-width: 80px; padding: 2px" )
                        //- CLIENT_APPROVAL_STATUS
                        div.icons(@click="showOnlineCheckedInformation(file)")
                            div(style="width: 9px; height: 9px; border-radius: 2px; margin-left: 3px; color: white; font-size: 7px; font-weight: 700; line-height: 10px" :style="{'background-color': fileClientApprovalStatusIconColor(file)}") {{ file.CLIENT_APPROVAL_STATUS === C_.casEdited ? "E" : "" }}
                        //- CONTENTS
                        div.icons(style="font-weight: 700; font-size: 10px; color: white; padding: 4px 0;")
                            div(@click="clickFileContents(file)" style="border-radius: 2px; margin-left: 3px; padding: 0px !important" :style="{'background-color': fileContentsIconText(file) ? '#5499C7' : '#FFFFFF' }") {{ fileContentsIconText(file) }}
                        //- COMMENTS
                        div.icons(@click="clickFileComments(file)" :style="{color: fileCommentIconColor(file)}") &#10033;
                    td(style="padding: 2px 11px; cursor: pointer" @click="downloadFile($event, file)" @contextmenu.prevent="contextMenu($event, file)")
                        div(:class="{'tooltip-file-name': reducedFileName(file).includes(' ... ')}" :data-tippy-content="file.FILE_NAME" style="max-width: calc(100% - 40px); text-overflow: ellipsis; overflow: hidden") {{ reducedFileName(file) }}
                        div(style="display: flex")
                            div.upload-details(style="padding-left: 20px") {{ wordCount(file) }} {{ fileCheckingMethod(file) }}
                            div(style="flex-grow: 1")
                            div.upload-details {{ uploadDetails(file) }}
                    td.right.aligned(style="width: 90px; min-width: 90px; max-width: 90px;")
                        div(style="display:flex; width: 100%")
                            div(style="width: 20px; margin: -5px; padding-top: 3px")
                                RadialProgress(v-if="file.downloadProgress" :progress="file.downloadProgress")
                            div(style="flex-grow: 1; text-align: right") {{ utils.formatByteSize(file.SIZE) }}
                tr(v-for="file in pendingFiles" style="font-size: 12px")
                    td.center.aligned.file-type(style="width: 115px; min-width: 115px; max-width: 115px; padding: 0" :style="{'background-color': fileTypeColors[file.FILE_TYPE]}") {{ fileTypeString(file) }}
                    td(style="width: 80px; min-width: 80px; max-width: 80px; padding: 2px; text-align: center") Cancel
                        i.x.icon.red(style="cursor:pointer; padding-left: 10px" @click="cancelUpload(file)")
                    td(style="padding: 2px 11px")
                        div(:class="{tooltip: reducedFileName(file).includes(' ... ')}" :data-tippy-content="file.FILE_NAME" style="max-width: calc(100% - 40px); text-overflow: ellipsis; overflow: hidden") {{ reducedFileName(file) }}
                        div.upload-details Uploading...
                    td.right.aligned(style="width: 90px; min-width: 90px; max-width: 90px;")
                        div(style="display:flex; width: 100%")
                            div(style="width: 20px; margin: -5px; padding-top: 3px")
                                RadialProgress(v-if="file.uploadProgress" :progress="file.uploadProgress")
                            div(style="flex-grow: 1; text-align: right") {{ utils.formatByteSize(file.SIZE) }}
    ProjectFilesUploader(v-if="!$attrs.hideUploader && !project.VIDEO_INTERPRETING_STATUS" ref="ProjectFilesUploader" :fileDropTypes="allowedFilesForUpload" :project="project" :colors="fileTypeColors")
    ProjectFilesContextMenu(ref="fileContextMenu" :project="project" :file="fileForContextMenu" @downloadAllFiles="downloadAllFiles" @uploadAsFinalFile="uploadAsFinalFile")
    ProjectUploadContents(ref="ProjectUploadContents" isForViewing)
</template>

<script>
import { store, cmg, constants as C_, utils } from "../../CoreModules"
import moment from "moment"
import TooltipMixin from "../../../Shared/Mixins/TooltipMixin"
import ProjectComponentsMixin from "./ProjectComponentsMixin"
import ProjectFilesUploader from "./ProjectFilesUploader"
import ProjectFilesContextMenu from "./ProjectFilesContextMenu"
import ProjectUploadContents from "../../../Shared/components/ProjectUploadContents"
import ScrollableTable from "../../../Shared/components/ScrollableTable"
import RadialProgress from "../../../Shared/components/RadialProgress"

export default {
    mixins: [ProjectComponentsMixin, TooltipMixin],

    components: { ProjectFilesUploader, ProjectFilesContextMenu, ScrollableTable, RadialProgress, ProjectUploadContents },

    props: {
        screen: String
    },

    data() {
        return {
            filterLanguage: 0,
            filterCounter: 0, // Is updated when the changing the filter checkboxes at the top, to force computing the files list
            fileForContextMenu: undefined
        }
    },

    computed: {
        files() {
            // Access the filterCounter, so the computed property depends on it
            this.filterCounter++

            this.initializeTooltip(".tooltip-file-name")

            // prettier-ignore
            return store.projectsFiles
                .filter(m => {
                    if (!m) return false
                    if (m.PROJECT_ID != this.project.PK) return false

                    if (this.$attrs.fileTypes && !this.$attrs.fileTypes.includes(m.FILE_TYPE)) return false
                    if (this.$refs.filterMain && !this.$refs.filterMain.isChecked() && [C_.pfMain, C_.pfReopenedMain].includes(m.FILE_TYPE)) return false
                    if (this.$refs.filterTranslated && !this.$refs.filterTranslated.isChecked() && [C_.pfTranslated, C_.pfReopenedTranslated].includes(m.FILE_TYPE)) return false
                    if (this.$refs.filterProofread && !this.$refs.filterProofread.isChecked() && [C_.pfProofread, C_.pfReopenedProofread].includes(m.FILE_TYPE)) return false
                    if (this.$refs.filterFinal && !this.$refs.filterFinal.isChecked() && [C_.pfFinal, C_.pfFinalSent, C_.pfReopenedFinal, C_.pfReopenedFinalSent].includes(m.FILE_TYPE)) return false
                    if (this.$refs.filterAdditional && !this.$refs.filterAdditional.isChecked() && [C_.pfReference, C_.pfCATAnalysis, C_.pfCATMemory, C_.pfClientPO, C_.pfArchive].includes(m.FILE_TYPE)) return false

                    if (this.filterLanguage && (m.isTranslated() || m.isProofread()) && m.SUBPROJECT_ID != this.filterLanguage) return false

                    return true
                })
                .sort((a, b) => sortValue(a) - sortValue(b))

            function sortValue(file) {
                const sortWeights = [15, 1, 3, 4, 5, 5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17]
                return (file.FILE_TYPE >= 0 && file.FILE_TYPE <= 15 ? sortWeights[file.FILE_TYPE] * 1e10 : 2e11) + (file.SUBPROJECT_ID % 100) * 1e7 + file.PK
            }
        },

        pendingFiles() {
            return store.pendingFileUploads.filter(file => file.PROJECT_ID === this.project.PK)
        },

        // This returns an array of new objects that have the PK of the subproject and the LANGUAGE name of the subproject's language
        targetLanguages() {
            const languages = [{ PK: 0, LANGUAGE: "All languages" }]
            this.project.subprojects().forEach(subproject => {
                languages.push({ PK: subproject.PK, LANGUAGE: subproject.languageName() })
            })
            return languages
        }
    },

    methods: {
        contextMenu(event, file) {
            this.fileForContextMenu = file
            this.$refs.fileContextMenu.show(event)
        },

        cancelUpload(pendingFile) {
            if (!pendingFile.xhr) return
            pendingFile.xhr.abort()
            store.removePendingFileUpload(pendingFile)
        },

        filterFiles() {
            this.filterCounter++
        },

        filterFilesByLanguage(field, value) {
            this.filterLanguage = value
        },

        reducedFileName(file) {
            const name = file.FILE_NAME || ""
            if (name.length > 60) return name.substring(0, 28) + " ...  " + name.substring(name.length - 28)
            return name
        },

        uploadDetails(projectFile) {
            let uploader = projectFile.EMPLOYEE_ID ? store.fullName(projectFile.EMPLOYEE_ID) : "Created by Tranwise"
            if (!projectFile.EMPLOYEE_ID && projectFile.FILE_TYPE === C_.pfFinal && projectFile.CLIENT_APPROVAL_STATUS === C_.casApproved)
                uploader = "Corrected file uploaded by client"
            return uploader + "     " + utils.formatDate(projectFile.UPLOAD_TIME, "DD MMM YYYY, HH:mm")
        },

        wordCount(projectFile) {
            if (projectFile && (projectFile.CONTENTS || "").startsWith("OCR-")) return projectFile.CONTENTS.slice(4) + " words"
            else return ""
        },

        fileCheckingMethod(projectFile) {
            if ((this.project.IS_NOTARIZED || this.project.IS_CERTIFIED) && projectFile.CONTENTS === "NOT_NC" && projectFile.FILE_TYPE == C_.pfFinal)
                return projectFile.ONLINE_EDITOR_LINK ? "Uploaded for online checking" : "Sent to check with old method"
            else return ""
        },

        showOnlineCheckedInformation(file) {
            if (file.ONLINE_CHECKED_BY) {
                const employee = store.employee(file.ONLINE_CHECKED_BY)
                this.$showMessage(`${employee ? employee.fullName() : "Somebody"} opened this file in the online editor.`)
            } else this.$showMessage("Nobody opened this file in the online editor.")
        },

        async updateWorkingManager() {
            if (this.project.WORKING_MANAGER_ID === store.myself.PK) return
            if (!store.myself.NAME_CODE) return
            if (this.project.askedAboutWorkingOnProject) return

            // Ask about working on the project
            const response = await this.$showDialog({
                message: "Are you working to deliver the files for this project?\n\nIf you click Yes, you will be marked as working on this project."
            })
            await utils.delay(100) // Because we might get a modal on this.$downloadFile below if the file doesn't exist
            if (response.selection === "Yes") cmg.updateObject(this.project, "WORKING_MANAGER_ID", store.myself.PK)

            this.project.askedAboutWorkingOnProject = true
        },

        folderNameForDownload(file) {
            const folderNames = {
                Main: [C_.pfMain, C_.pfMainConvPDF, C_.pfReopenedMain],
                Translated: [C_.pfTranslated, C_.pfReopenedTranslated],
                Proofread: [C_.pfProofread, C_.pfReopenedProofread],
                Final: [C_.pfFinal, C_.pfFinalSent, C_.pfReopenedFinal, C_.pfReopenedFinalSent, C_.pfReference, C_.pfEdited],
                CAT: [C_.pfCATAnalysis, C_.pfCATMemory]
            }

            let folderName = "Other"
            for (let [folder, fileTypes] of Object.entries(folderNames)) if (fileTypes.includes(file.FILE_TYPE)) folderName = folder

            // If the file is translated or proofread and has a SUBPROJECT_ID, add the language name to the folder name
            if (file.SUBPROJECT_ID && [C_.pfTranslated, C_.pfProofread, C_.pfReopenedProofread, C_.pfReopenedTranslated].includes(file.FILE_TYPE)) {
                if (file.SUBPROJECT_ID > 0) {
                    const subproject = store.subproject(file.SUBPROJECT_ID)
                    if (subproject) folderName = `${store.languageName(subproject.LANGUAGE_ID)} ${folderName}`
                }
            }

            return folderName
        },

        async downloadFile(event, file) {
            await this.updateWorkingManager()
            file.shouldOpen = event.metaKey || event.ctrlKey
            this.$downloadFile(file, "Projects/" + this.project.PROJECT_NUMBER + "/" + this.folderNameForDownload(file))
        },

        async downloadAllFiles() {
            await this.updateWorkingManager()

            for (let file of this.files)
                if ([C_.pfMain, C_.pfMainConvPDF, C_.pfReopenedMain, C_.pfTranslated, C_.pfProofread, C_.pfReopenedProofread, C_.pfReopenedTranslated].includes(file.FILE_TYPE))
                    this.$downloadFile(file, "Projects/" + this.project.PROJECT_NUMBER + "/" + this.folderNameForDownload(file))
        },

        async uploadAsFinalFile(file) {
            // Ask the questions about the final file
            const questionsResponse = await this.$refs.ProjectFilesUploader.askQuestionsAboutTheFinalFile()
            if (questionsResponse === undefined) return

            const projectFile = {
                table: "PROJECTS_FILES",
                PROJECT_ID: file.PROJECT_ID,
                FILE_TYPE: C_.pfFinal,
                FILE_NAME: file.FILE_NAME,
                SIZE: file.SIZE,
                PREFIX: file.PK,
                CONTENTS: questionsResponse.contents
            }

            // If we got any fields to set in response to the questions (eg. ONLINE_EDITOR_LINK), add them to the fileInfo
            questionsResponse.fieldsToAdd.forEach(item => (projectFile[item.field] = item.value))

            cmg.insertObject(projectFile)
        },

        fileTypeString(file) {
            const type = file.FILE_TYPE
            let result = C_.projectFilesStringTypesShort[type]
            if (file.CONTENTS === "CONV PDF") result += " CONV PDF"

            if ((this.project.IS_NOTARIZED || this.project.IS_CERTIFIED) && file.CONTENTS === "NOT_NC" && file.FILE_TYPE == C_.pfFinal) {
                if (file.CONTENTS_OTHER === "PRE_CHECKING") result = "PRE CHECKING"
                else result = "FOR CHECKING"
            }

            if (file.SUBPROJECT_ID > 0) {
                const subproject = store.subproject(file.SUBPROJECT_ID)
                if (subproject) result += ` [${store.languageName(subproject.LANGUAGE_ID).substring(0, 3)}]`
            }

            return result
        },

        fileTypeColor(file) {
            if (file.FILE_TYPE === C_.pfMain && (file.CONTENTS || "").startsWith("OCR-")) return "#CCFACC"
            return this.fileTypeColors[file.FILE_TYPE]
        },

        fileCommentIconColor(file) {
            if (!file.COMMENTS) return "#FFFFFF00"
            if (file.isTranslated() || file.isProofread()) {
                if (file.COMMENTS.length > 6 || file.COMMENTS.substring(0, 6).search("0") >= 0) return "#EC7063"
                if (file.COMMENTS.length === 6 && file.COMMENTS.substring(0, 6).search("0") < 0) return "#FADBD8"
            }
            return "#FFFFFF00"
        },

        fileClientApprovalStatusIconColor(file) {
            const colors = ["#FFFFFF00", "#F5B041", "#5ED13F", "#E74C3C", "#5499FF"]
            return colors[file.CLIENT_APPROVAL_STATUS]
        },

        fileContentsIconText(file) {
            if (file.CONTENTS === "QA") return "QA"
            if (file.isTranslated() || file.isProofread()) return "C"
            return ""
        },

        clickFileContents(file) {
            if (file.isTranslated() || file.isProofread()) {
                this.$refs.ProjectUploadContents.show(file.CONTENTS, file.CONTENTS_OTHER)
            }
            if (file.CONTENTS === "QA") this.$showMessage("This file was marked as containing a QA report.")
        },

        clickFileComments(file) {
            if (!file.isTranslated() && !file.isProofread()) return "C"
            const translatorType = file.isTranslated() ? "translator" : "proofreader"
            const comments = file.COMMENTS
            if (comments.length < 6) {
                this.$showMessage(`The ${translatorType} did not fill the form about this file's quality.`)
                return
            }
            let s = `The ${translatorType}'s response to the following questions:

Did you run a spell checker?\t\t\t\t\t${comments[0] === "1" ? "YES" : "NO"}
Did you check the terminology?\t\t\t\t${comments[1] === "1" ? "YES" : "NO"}
Did you check the projects instructions?\t\t${comments[2] === "1" ? "YES" : "NO"}
Did you use the right software if requested?\t${comments[3] === "1" ? "YES" : "NO"}
Are you confident that it's a good translation?\t${comments[4] === "1" ? "YES" : "NO"}

`
            if (comments[5] === "1") s += `The ${translatorType} declared that they are absolutely sure that this is a good translation and without errors.\n\n`
            else s += `The ${translatorType} did NOT agree that they are absolutely sure that this is a good translation and without errors.\n\n`

            if (comments.length > 6) s += `Comments:\n\n${comments.substring(6)}`
            else s += `The ${translatorType} has no other comments.`

            this.$showMessage(s)
        }
    },

    created() {
        this.fileTypeColors = [
            "#FFFFFF",
            "#D1CCFD",
            "#B5ECF2",
            "#C6ECA4",
            "#FFFABB",
            "#F0D7B7",
            "#D1CCFD",
            "#B5ECF2",
            "#C6ECA4",
            "#FFFABB",
            "#F0D7B7",
            "#CECECE",
            "#CECECE",
            "#CECECE",
            "#CECECE",
            "#CECECE",
            "#CCFACC",
            "#CCFACC",
            "#BBFADD",
            "#FCEBF3"
        ]

        if (this.screen === "Files")
            this.allowedFilesForUpload = [
                { fileType: C_.pfMain, typeName: "MAIN" },
                { fileType: C_.pfMainConvPDF, typeName: "MAIN (CONV PDF)" },
                { fileType: C_.pfReference, typeName: "REFERENCE" },
                { fileType: C_.pfCATMemory, typeName: "MEMORY" },
                { fileType: C_.pfCATAnalysis, typeName: "ANALYSIS" },
                { fileType: C_.pfClientPO, typeName: "PO" }
            ]

        if (this.screen === "Deliveries")
            this.allowedFilesForUpload = [
                { fileType: C_.pfMain, typeName: "MAIN" },
                { fileType: C_.pfReference, typeName: "REFERENCE" },
                { fileType: C_.pfTranslated, typeName: "TRANSLATE" },
                { fileType: C_.pfProofread, typeName: "PROOFREAD" },
                { fileType: C_.pfEdited, typeName: "EDITED" },
                { fileType: C_.pfFinal, typeName: "FINAL" },
                { fileType: C_.pfDigitalCertification, typeName: "DIGI CERT" },
                { fileType: C_.pfDigitalNotarization, typeName: "DIGI NOTR" },
                { fileType: C_.pfRegularNotarization, typeName: "NOTRZ" }
            ]

        if (this.screen === "Custom")
            this.allowedFilesForUpload = [
                { fileType: C_.pfMain, typeName: "MAIN" },
                { fileType: C_.pfTranslated, typeName: "TRANSLATE" },
                { fileType: C_.pfProofread, typeName: "PROOFREAD" },
                { fileType: C_.pfFinal, typeName: "FINAL" }
            ]

        if (this.screen === "Reopened")
            this.allowedFilesForUpload = [
                { fileType: C_.pfReopenedMain, typeName: "MAIN" },
                { fileType: C_.pfReopenedTranslated, typeName: "TRANSLATE" },
                { fileType: C_.pfReopenedProofread, typeName: "PROOFREAD" },
                { fileType: C_.pfReopenedFinal, typeName: "FINAL" }
            ]
    }
}
</script>

<style scoped>
.file-type {
    min-width: 100px;
}

.icons {
    display: inline-block;
    width: 20px;
    text-align: center;
    cursor: pointer;
}

#files-wrapper {
    margin-bottom: 0;
}

.upload-details {
    text-align: right;
    font-size: 10px;
    color: rgb(128, 128, 128);
    white-space: pre;
}

#no-files-placeholder {
    border: thin solid rgb(233, 233, 233);
    height: 100%;
    border-radius: 3px;
    background-color: white;
    color: lightgrey;
    height: 100%;
    display: grid;
    align-items: center;
    justify-content: center;
}
</style>
