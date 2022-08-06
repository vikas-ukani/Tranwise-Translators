<template lang="pug">
div
    .ui.horizontal.segments(style="min-height: 0; background-color: #f9f9f9; margin-top: -1px; border-top: 1px solid white; border-radius: 0 0 5px 5px")
        UploaderSegment(v-for="fileDropType in fileDropTypes" :fileType="fileDropType.fileType" :fileTypeName="fileDropType.typeName" :key="fileDropType.typeName" :dropFile="uploadFile" :colors="colors")
</template>

<script>
import UploaderSegment from "../../../Shared/components/FileUploaderSegment"
import { store, utils, constants as C_ } from "../../CoreModules"

export default {
    props: {
        fileDropTypes: Array,
        colors: Array,
        project: Object
    },

    components: { UploaderSegment },

    methods: {
        async uploadFile(fileType, files) {
            let contents
            let subprojectID
            let fieldsToAdd = []

            // If the file is final, ask some questions about the file
            if (fileType === C_.pfFinal) {
                const questionsResponse = await this.askQuestionsAboutTheFinalFile()
                if (questionsResponse === undefined) return
                contents = questionsResponse.contents
                fieldsToAdd = questionsResponse.fieldsToAdd
            }

            // If the file is digital certification and the project is not marked as having digital certification,
            // make sure that the user wants to upload the file
            if (fileType === C_.pfDigitalCertification && !this.project.DIGITAL_CERTIFICATION_STATUS) {
                const message = "This project is not marked as requiring digital certification.\n\nAre you sure you want to upload a digital certification?"
                if (!(await this.$dialogCheck(message))) return
            }

            // If the file is translated or proofread or edited, select the subproject for which you are uploading the file
            if ([C_.pfTranslated, C_.pfProofread, C_.pfReopenedTranslated, C_.pfReopenedProofread, C_.pfEdited].includes(fileType)) {
                subprojectID = await this.askQuestionsAboutTheTranslatedFile()
                if (subprojectID === undefined) return
            }

            // If the selection was "MAIN (CONV PDF)", set the type to Main and the contents to CONV PDF
            if (fileType === C_.pfMainConvPDF) {
                fileType = C_.pfMain
                contents = "CONV PDF"
            }

            // Do the actual upload
            const fileInfo = {
                table: "PROJECTS_FILES",
                FILE_TYPE: fileType,
                PROJECT_ID: this.project.PK,
                SUBPROJECT_ID: subprojectID || 0,
                CONTENTS: contents || ""
            }

            // If we got any fields to set in response to the questions (eg. ONLINE_EDITOR_LINK), add them to the fileInfo
            fieldsToAdd.forEach(item => (fileInfo[item.field] = item.value))

            for (let i = 0, file; (file = files[i]); i++) {
                const pendingFile = { FILE_TYPE: fileType, FILE_NAME: file.name, SIZE: file.size, PROJECT_ID: this.project.PK }
                store.pendingFileUploads.push(pendingFile)
                // uploadFile returns the XMLHttpRequest used to upload the file. Set it on the pending file, so we can call .abort() on it if needed
                pendingFile.xhr = this.$uploadFile(file, fileInfo, store.uploadTokens.PROJECTS, progress => {
                    this.$set(pendingFile, "uploadProgress", progress)
                })
            }
        },

        async askQuestionsAboutTheFinalFile() {
            let contents = ""
            let fieldsToAdd = []

            // If it's a TagEditor project
            const cat = this.project.CAT_TOOLS
            if (cat.substring(1, 2) === "1" || cat.substring(11, 12) === "1" || cat.substring(12, 13) === "1") {
                if (
                    !(await this.$dialogCheck(
                        "Please note that this is a TagEditor project, and you need to ask the support team to check the files for tag errors.\n\n" +
                            "When you have TagEditor projects, please never change the name of the file. It has to be the exact name as the source file you have received from the client.\n\n" +
                            'Click "No" to cancel the upload.\n\n' +
                            'By clicking the "Yes" button below, you agree that the file you are about to upload has been checked for tag errors.'
                    ))
                )
                    return
                await utils.delay(200)
            }

            // If translators have comments
            const translatorsComments = this.project.translatorsComments()

            if (translatorsComments) {
                const response = await this.$showDialog({
                    header: "Translators' comments",
                    message: `Some translators have comments. Please make sure you take them into account.\n\n${translatorsComments}`,
                    buttons: ["Cancel", "Upload file"],
                    buttonClasses: ["", "positive"]
                })

                if (response.selection != "Upload file") return
                await utils.delay(200)
            }

            // If needs QA report
            if (this.project.NEEDS_QA_REPORT) {
                const response = await this.$showDialog({
                    header: `This project requires a QA report`,
                    message: `Does the file you are uploading include the QA report?`,
                    buttons: ["Cancel upload", "No", "Yes"],
                    buttonClasses: ["", "negative", "positive"]
                })

                if (response.selection === "Cancel upload") return
                if (response.selection === "Yes") contents = "QA"
                await utils.delay(200)
            }

            if (this.project.PROJECT_TYPE === C_.ptTranslate && !this.project.IS_CERTIFIED) {
                const response = await this.$showDialog({
                    header: `Using Grammarly is required`,
                    message: `Did you use Grammarly to check the text before uploading this final file?`,
                    buttons: ["Cancel upload", "No", "Yes"],
                    buttonClasses: ["", "negative", "positive"]
                })

                if (response.selection === "Cancel upload") return
                if (response.selection === "Yes") fieldsToAdd.push({ field: "FILE_WAS_CHECKED_WITH_GRAMMARLY", value: true })
            }

            // If is certified
            if (this.project.IS_CERTIFIED || this.project.IS_NOTARIZED) {
                contents = "NOT_NC"
                const response = await this.$showDialog({
                    header: `This is a certified project`,
                    message: `Does the file you are uploading include the certified file?`,
                    buttons: ["Cancel upload", "No", "Yes"],
                    buttonClasses: ["", "negative", "positive"]
                })

                if (response.selection === "Cancel upload") return
                if (response.selection === "Yes") contents = "NC"

                if (contents === "NOT_NC") {
                    const response = await this.$showDialog({
                        header: `Select the method of checking the file`,
                        message: `Tranwise will ask the client to check the translated file if you use the old method or upload the file to the online editor without sending it to the client.\n\nDo you want to use the online editor for this file?`,
                        buttons: ["Cancel upload", "Use the old method", "Use online editor"],
                        buttonClasses: ["", "purple", "teal"]
                    })
                    if (response.selection === "Cancel upload") return
                    if (response.selection === "Use online editor") fieldsToAdd.push({ field: "ONLINE_EDITOR_LINK", value: "LINK" })
                }
            }

            return { contents, fieldsToAdd }
        },

        async askQuestionsAboutTheTranslatedFile() {
            let subprojectID = 0
            const subprojects = this.project.subprojects()

            // prettier-ignore
            if (this.$checkWithMessage(subprojects.length === 0, "This project doesn't have any target language added.\n\n"
                 + "Please add a target language before uploading a translated or proofread file.")) return

            if (subprojects.length === 1) {
                subprojectID = subprojects[0].PK
            } else {
                // If the project has more than one target language, ask which subproject is the upload for

                const languages = []
                subprojects.forEach(subproject => {
                    languages.push({ PK: subproject.PK, LANGUAGE: subproject.languageName() })
                })

                const response = await this.$showDialog({
                    message: "Select the target language to upload the file to:",
                    dropdownDefaultText: "Select a target language",
                    dropdownItems: languages,
                    dropdownKey: "LANGUAGE",
                    dropdownField: "PK"
                })

                if (response.selection != "OK") return
                subprojectID = response.value
            }
            return subprojectID
        },

        fileBackgroundClassName(fileType) {
            let classObject = {}
            classObject[`file-${fileType}`] = true
            return classObject
        }
    }
}
</script>

<style scoped></style>
