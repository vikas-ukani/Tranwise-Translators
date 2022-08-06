<template lang="pug">
#projects-files-wrapper
    .ui.form(style="display: flex; flex-direction: column")
        .fields.inline(style="margin-bottom: 0.6em !important")
            .field
                label Filter files:
            .field(style="padding-right: 20px")
                TWCheckbox(checked ref="filterMain" label="MAIN" :change="filterFiles")
            .field(style="padding-right: 20px")
                TWCheckbox(checked ref="filterTranslated" label="TRANSLATED" :change="filterFiles")
            .field(style="padding-right: 20px")
                TWCheckbox(checked ref="filterProofread" label="PROOFREAD" :change="filterFiles")
            .field(style="padding-right: 20px; flex-grow: 1")
                TWCheckbox(checked ref="filterAdditional" label="OTHER" :change="filterFiles")
            .field
                i.ui.icon.question.circle.outline.large.clickable(style="color: #0094c3" @click="showFilesHelp")
            .field(style="padding-right: 0px")
                .ui.button.coolblue.tiny(@click="downloadAllFiles" :class="{disabled: !files.length}") {{ downloadAllFilesButtonName }}
        #files-wrapper(style="flex: 1 1 auto")
            #no-files-placeholder(v-if="!files.length && !pendingFiles.length" style="min-height: 100px") No files to show
            table.ui.celled.striped.table(v-else style="border-radius: 5px")
                tbody
                    tr(v-for="file in files" style="font-size: 12px")
                        td.center.aligned.file-type(v-if="file.table === 'PROJECTS_FILES'" style="width: 115px; min-width: 115px; max-width: 115px; padding: 0; cursor: pointer" @click="downloadFile(file)" :style="{'background-color': fileTypeColors[file.FILE_TYPE]}") {{ fileTypeString(file) }}
                        td.center.aligned.file-type(v-else style="width: 115px; min-width: 115px; max-width: 115px; padding: 0; cursor: pointer; background-color: #F0D7B7" @click="downloadFile(file)") CLIENT REF
                        td(style="padding: 2px 11px; cursor: pointer" @click="downloadFile(file)")
                            div(:class="{tooltip: reducedFileName(file).includes(' ... ')}" :data-tippy-content="file.FILE_NAME" style="max-width: calc(100% - 40px); text-overflow: ellipsis; overflow: hidden") {{ reducedFileName(file) }}
                            div.upload-details(v-if="file.table === 'PROJECTS_FILES'") {{ uploadDetails(file) }}
                        td.right.aligned(style="width: 90px; min-width: 90px; max-width: 90px;")
                            div(style="display:flex; width: 100%")
                                div(style="width: 20px; margin: -5px; padding-top: 3px")
                                    RadialProgress(v-if="file.downloadProgress" :progress="file.downloadProgress")
                                div(style="flex-grow: 1; text-align: right") {{ utils.formatByteSize(file.SIZE) }}
                    tr(v-for="file in pendingFiles" style="font-size: 12px")
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
    #current-project-download-path(style="display: none")
</template>

<script>
import store from "../Store/StoreTR"
import cmg from "../ConnectionManagerTR"
import utils from "../UtilsTR"
import C_ from "../ConstantsTR"
import moment from "moment"
import TooltipMixin from "../../Shared/Mixins/TooltipMixin"
import RadialProgress from "../../Shared/components/RadialProgress"

export default {
    mixins: [TooltipMixin],

    components: { RadialProgress },

    props: {
        project: Object,
        subproject: Object,
        translation: Object
    },

    data() {
        return {
            filterCounter: 0, // Is updated when the changing the filter checkboxes at the top, to force computing the files list
            downloadAllFilesButtonName: "Download all files"
        }
    },

    computed: {
        files() {
            // Access the filterCounter, so the computed property depends on it
            this.filterCounter++

            this.initializeTooltip()

            // prettier-ignore
            const projectsFiles = store.projectsFiles
                .filter(m => {
                    if (!m) return false
                    if (m.PROJECT_ID != this.project.PK) return false

                    let shouldSkip = true
                    // Show the main and reference files to everyone
                    if ([C_.pfMain, C_.pfReopenedMain, C_.pfReference, C_.pfCATAnalysis, C_.pfCATMemory].includes(m.FILE_TYPE)) shouldSkip = false

                    // Show the translated and proofread files only if the employee is assigned and the files are for the selected subproject
                    if (this.translation && this.translation.isAssigned && [C_.pfTranslated, C_.pfReopenedTranslated, C_.pfProofread, C_.pfReopenedProofread, C_.pfEdited].includes(m.FILE_TYPE)
                        && this.subproject && this.subproject.PK === m.SUBPROJECT_ID) shouldSkip = false

                    if (shouldSkip) return false

                    if (this.$refs.filterMain && !this.$refs.filterMain.isChecked() && [C_.pfMain, C_.pfReopenedMain].includes(m.FILE_TYPE)) return false
                    if (this.$refs.filterTranslated && !this.$refs.filterTranslated.isChecked() && [C_.pfTranslated, C_.pfReopenedTranslated].includes(m.FILE_TYPE)) return false
                    if (this.$refs.filterProofread && !this.$refs.filterProofread.isChecked() && [C_.pfProofread, C_.pfReopenedProofread].includes(m.FILE_TYPE)) return false
                    if (this.$refs.filterAdditional && !this.$refs.filterAdditional.isChecked() && [C_.pfReference, C_.pfCATAnalysis, C_.pfCATMemory, C_.pfEdited].includes(m.FILE_TYPE)) return false
                    
                    if (this.filterLanguage && (m.isTranslated() || m.isProofread()) && m.SUBPROJECT_ID != this.filterLanguage) return false
                    
                    return true
                })

            function sortValue(file) {
                const sortWeights = [0, 1, 7, 8, 0, 0, 2, 7, 8, 0, 0, 3, 4, 5, 0, 0, 0, 0, 0, 9]
                const weight = file.table === "CLIENTS_FILES" ? 6 : sortWeights[file.FILE_TYPE]
                return weight * 1e10 + file.PK
            }

            const clientsFiles = store.clientsFiles.filter(file => file.CLIENT_ID === this.project.CLIENT_ID)

            return [...projectsFiles, ...clientsFiles].sort((a, b) => sortValue(a) - sortValue(b))
        },

        pendingFiles() {
            return store.pendingFileUploads.filter(file => file.PROJECT_ID === this.project.PK && file.SUBPROJECT_ID === this.subproject.PK)
        }
    },

    methods: {
        cancelUpload(pendingFile) {
            if (!pendingFile.xhr) return
            pendingFile.xhr.abort()
            store.removePendingFileUpload(pendingFile)
        },

        filterFiles() {
            this.filterCounter++

            const isUnchecked = filter => this.$refs["filter" + filter] && !this.$refs["filter" + filter].isChecked()
            // Change the "Download all files" button name based on the filters
            if (isUnchecked("Main") || isUnchecked("Translated") || isUnchecked("Proofread") || isUnchecked("Additional"))
                this.downloadAllFilesButtonName = "Download selected files"
            else this.downloadAllFilesButtonName = "Download all files"
        },

        reducedFileName(file) {
            const name = file.FILE_NAME || ""
            if (name.length > 72) return name.substring(0, 32) + " ...  " + name.substring(name.length - 32)
            return name
        },

        uploadDetails(projectFile) {
            let uploaderName = store.fullName(projectFile.EMPLOYEE_ID)
            // If we didn't find the employee in the store, use the UPLOADER_NAME value that came with the projectFile
            if (uploaderName === "?" && projectFile.UPLOADER_NAME) uploaderName = projectFile.UPLOADER_NAME

            let result = uploaderName + "     " + utils.formatDate(projectFile.UPLOAD_TIME, "DD MMM YYYY, HH:mm")
            return result
        },

        folderNameForDownload(file) {
            const folderNames = {
                Main: [C_.pfMain, C_.pfMainConvPDF, C_.pfReopenedMain],
                Translated: [C_.pfTranslated, C_.pfReopenedTranslated],
                Proofread: [C_.pfProofread, C_.pfReopenedProofread],
                Reference: [C_.pfReference],
                Edited: [C_.pfEdited],
                CAT: [C_.pfCATAnalysis, C_.pfCATMemory]
            }

            let folderName = "Other"
            for (let [folder, fileTypes] of Object.entries(folderNames)) if (fileTypes.includes(file.FILE_TYPE)) folderName = folder

            return folderName
        },

        showFilesHelp() {
            const message =
                "Here are a few hints to help you getting started with the files section of Tranwise:\n\n" +
                "Do not start working on a project unless you are assigned to either translate or proofread it. " +
                "The main files that have to be translated are available for everyone to download, in order to see whether you are willing to take the job or not. " +
                "That doesn't mean you are assigned to work on the job. You can see if you have been assigned on this page, above the files list.\n\n" +
                'If you have been assigned to translate or proofread a file, after completing the job, use the "Upload your translation" or "Upload your proofreading" buttons on this screen ' +
                "to upload your work. Note that those buttons are visible only if you have been assigned to work on the project, and only one of them will show up, depending on the task you were " +
                "given (translation or proofreading).\n\n" +
                'You can download the files either by clicking on the filename or using the "Download all files" button.\n\n' +
                '<strong>Note:</strong> By default, all files will be saved to your downloads folder. If you want to organize the files in different folders by project, please go to the "Get the Chrome extension" page from the main menu and follow the instructions there.'
            this.$showHTMLMessage(message)
        },

        async downloadFile(file) {
            this.$downloadFile(file, "Projects/" + this.project.PROJECT_NUMBER + "/" + this.folderNameForDownload(file))
        },

        async downloadAllFiles() {
            // If we have installed the extension and the user has opted to ask where to save each download
            if (localStorage.TranwiseExtensionID && store.Preferences("askForDownloads")) {
                // Clear this invisible div. Its content will be set by the extension and inspected in the setInterval below.
                $("#current-project-download-path").text("")

                // Send a message to the extension, which makes it download a dummy blob, in order to have the user select the desired location
                chrome.runtime.sendMessage(localStorage.TranwiseExtensionID, { downloadAllFilesAndAskForLocation: true, projectNumber: this.project.PROJECT_NUMBER })

                // Set up an interval that checks the above div for changes in content, which is a signal that the location
                // has been selected and the downloads can start.
                this.intervalForDownloadAllFilesWithLocation = setInterval(() => {
                    // The textContent of the div is set by the extension
                    let downloadPath = $("#current-project-download-path").text()

                    if (downloadPath === "CANCEL") {
                        clearInterval(this.intervalForDownloadAllFilesWithLocation)
                        return
                    }

                    downloadPath = downloadPath.slice(downloadPath.indexOf("/Tranwise/") + 9)
                    if (downloadPath) {
                        $("#current-project-download-path").text("")
                        clearInterval(this.intervalForDownloadAllFilesWithLocation)
                        for (let file of this.files) {
                            this.$downloadFile(file, "IsForDownloadAllFiles" + downloadPath + "/" + this.folderNameForDownload(file))
                        }
                    }
                }, 100)
            } else {
                for (let file of this.files) this.$downloadFile(file, "Projects/" + this.project.PROJECT_NUMBER + "/" + this.folderNameForDownload(file))
            }
        },

        fileTypeString(file) {
            return C_.projectFilesStringTypes[file.FILE_TYPE]
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
            "#F0D7B7",
            "#CECECE",
            "#CECECE",
            "#CECECE",
            "#CECECE",
            "#CCFACC",
            "#CCFACC",
            "#CCFACC",
            "#FCEBF3"
        ]

        this.utils = utils
    }
}
</script>

<style scoped>
#projects-files-wrapper {
    padding: 15px 20px 20px 20px;
    border-top: thin solid rgb(149, 159, 165);
}

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

#files-wrapper tbody {
    overflow-y: auto;
}
</style>
