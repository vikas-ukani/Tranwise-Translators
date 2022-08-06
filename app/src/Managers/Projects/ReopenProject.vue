<template lang="pug">
#modal-reopen-project.ui.small.modal
    .header Reopen project {{ project.PROJECT_NUMBER }}
    i.close.icon
    .content
        .ui.grid.form
            .ui.six.wide.column
                .field
                    label Languages to reopen
                    #subprojects-list
                        .subproject-row(v-for="subproject in languagesToReopen")
                            .ui.checkbox.reopenProject
                                input(type="checkbox" :id="'checkbox-' + subproject.PK" @change="selectSubproject(subproject.PK, $event.target.checked ? 1 : 0)" )
                                label(:for="'checkbox-' + subproject.PK" style="cursor: pointer; font-size: 12.5px !important") {{ subproject.language }}
                .field
                    .ui.calendar(ref="calendar")
                        .ui.input.left.icon
                            i.calendar.alternate.outline.icon
                            input(ref="calendarInput" type="text" @blur="setNewDeadline" placeholder="New deadline" style="width: 190px; text-align: right")
            .ui.ten.wide.column
                .field 
                    label Comments received from the client
                    TWTextArea(:obj="options" field="clientComments" :change="updateOptions")
            .field
                TWCheckbox(label="Copy the files that were sent to the client to the reopened files section" :obj="options" :change="updateOptions" field="copyFiles")
            .field
    .actions
        div(style="flex-grow: 1; text-align: left; color: red; padding: 10px")
            div(:class="{hidden: !errorMessage}") {{ errorMessage }}
        .ui.cancel.button.transition Cancel
        .ui.coolgreen.button.transition(@click="doReopenProject") Reopen project 
        //- This hidden button is used to close the modal. The one above should not close it,
        //- as there might be errors in the form.
        .ui.button.positive.reopen-project-dummy-button(style="display: none")  
</template>

<script>
import { store, utils, cmg, constants as C_ } from "../CoreModules"
import moment from "moment"
import CoreMixin from "../../Shared/Mixins/CoreMixin"

export default {
    props: {
        project: Object
    },

    mixins: [CoreMixin],

    data() {
        return {
            options: {
                newDeadline: 0,
                clientComments: "",
                copyFiles: false,
                subprojectsToReopen: {}
            },
            errorMessage: ""
        }
    },

    computed: {
        languagesToReopen() {
            const checkboxes = []
            this.project.subprojects().forEach(subproject => {
                checkboxes.push({ PK: subproject.PK, language: store.languageName(subproject.LANGUAGE_ID), shouldReopen: false })
            })
            return checkboxes
        }
    },

    methods: {
        updateOptions(field, value) {
            if (field === "copyFiles") this.options.copyFiles = value
            if (field === "clientComments") this.options.clientComments = value
        },

        selectSubproject(pk, value) {
            this.options.subprojectsToReopen[pk] = value
        },

        setNewDeadline() {
            const date = $(this.$refs.calendar).calendar("get date")
            if (date) {
                // This ensures that the timestamp is converted and displayed in the server time, not the local time
                const deltaFromServer = new Date().getTimezoneOffset() * 60
                const timestamp = date.getTime() / 1000
                this.options.newDeadline = timestamp - deltaFromServer
            }
        },

        // This method is called by the parent (ProjectsOverview)
        reopenProject() {
            // Reset the values that could be set on a previous attempt
            this.errorMessage = ""
            this.options.newDeadline = 0
            this.options.clientComments = ""
            this.options.copyFiles = false
            this.options.subprojectsToReopen = {}
            $(".ui.checkbox.reopenProject").checkbox("uncheck")

            const vm = this

            // Show the modal with some extra options
            this.showModal("#modal-reopen-project", {
                autofocus: false,
                onShow() {
                    const calendarOptions = {
                        initialDate: 0,
                        formatter: {
                            datetime: function(datetime, settings) {
                                return moment(datetime).format("D MMM YYYY   HH:mm")
                            }
                        },
                        ampm: false,
                        onHide() {
                            vm.$refs.calendarInput.blur()
                        }
                    }
                    $(vm.$refs.calendar).calendar(calendarOptions)
                    vm.$refs.calendarInput.value = ""
                }
            })
        },

        // Perform the actual reopening
        doReopenProject() {
            const subprojects = []

            // The subprojects to reopen can contain objects like { 123456: 0 } if a subproject was
            // selected and then deselected. This filters out those values and creates an array with
            // the IDs of the subprojects to be reopened.
            for (let key in this.options.subprojectsToReopen) if (this.options.subprojectsToReopen[key]) subprojects.push(key)

            if (!subprojects.length) this.errorMessage = "Please select at least a target language to reopen."
            else if (this.options.newDeadline === 0) this.errorMessage = "Please select the new deadline."
            else this.errorMessage = ""

            if (this.errorMessage) return

            // This triggers the closing of the form
            $(".reopen-project-dummy-button").click()

            // Do the actual reopening

            let reopenedTargetLanguages = ""
            for (let subprojectID of subprojects) {
                const subproject = store.subproject(subprojectID)
                cmg.updateObject(subproject, "IS_REOPENED", true)
                reopenedTargetLanguages += store.languageName(subproject.LANGUAGE_ID) + ", "
            }
            reopenedTargetLanguages = reopenedTargetLanguages.slice(0, -2)

            cmg.updateObject(this.project, "STATUS", C_.psReopened)
            cmg.updateObject(this.project, "WORKING_MANAGER_ID", 0)
            cmg.updateObject(this.project, "DEADLINE_REOPENED", this.options.newDeadline)
            cmg.updateObject(this.project, "REOPENED_TIME", "SERVER_TIME_TAG")
            cmg.updateObject(this.project, "IS_DELIVERED", false)
            cmg.updateObject(
                this.project,
                "REOPEN_COMMENTS",
                `== Reopened ${reopenedTargetLanguages} on $SERVER_TIME$\n\n${this.options.clientComments}\n\n${this.project.REOPEN_COMMENTS}`
            )
            if (this.project.DIGITAL_CERTIFICATION_STATUS === 2) cmg.updateObject(this.project, "DIGITAL_CERTIFICATION_STATUS", 1)

            store.addToProjectsHistory(this.project, C_.psReopened)

            // Copy the final sent files as reopened files
            if (this.options.copyFiles) {
                store.projectsFiles.forEach(file => {
                    if (!file) return
                    if (file.PROJECT_ID != this.project.PK) return
                    if (file.FILE_TYPE != C_.pfFinalSent) return

                    const projectFile = {
                        table: "PROJECTS_FILES",
                        PROJECT_ID: this.project.PK,
                        FILE_TYPE: C_.pfReopenedMain,
                        FILE_NAME: file.FILE_NAME,
                        SIZE: file.SIZE,
                        PREFIX: file.PK
                    }
                    cmg.insertObject(projectFile)
                })
            }

            let translatorsNames = ""
            let proofreadersNames = ""

            // Send a message to all the assigned translators for reopened subprojects
            this.project.assignedTranslations().forEach(translation => {
                const employee = translation.employee()
                if (translation.STATUS === C_.tsTranslating) translatorsNames += employee.fullName() + ", "
                if (translation.STATUS === C_.tsProofreading) proofreadersNames += employee.fullName() + ", "

                const message =
                    `THE CLIENT CAME BACK WITH QUESTIONS ABOUT PROJECT ${this.project.PROJECT_NUMBER}. ` +
                    `Please check the project's details page to read the comments at the top of the instructions for the project and respond accordingly. ` +
                    `Also, please make sure that you apply the changes requested by the client on the file provided by the client. ` +
                    `If you cannot access that file, please ask the project manager or the delivery team for it. Thank you!`

                store.sendEmployeeMessage(employee, message)
                cmg.sendMessage(cmg.messageHeaders.SEND_TELEGRAM_TO_EMPLOYEE, employee.PK, message)

                cmg.updateObject(translation, "CONFIRMED", false)
            })

            // Send an email to the recruitment manager
            const textForManagers =
                `Dear Recruitment Manager,\n\n` +
                `Project ${this.project.PROJECT_NUMBER} has been reopened. Below are the project's details, so you may check the translators.\n\n` +
                `Project number:  ${this.project.PROJECT_NUMBER}\n\n` +
                `Source language: ${store.languageName(this.project.SOURCE_LANGUAGE_ID)}\n\n` +
                `Reopened target languages: ${reopenedTargetLanguages}\n\n` +
                `Translators: ${translatorsNames.slice(0, -2)}\n\n` +
                `Proofreaders: ${proofreadersNames.slice(0, -2)}\n\n`

            cmg.sendEmail("RECRUITMENT_EMAIL", "RECRUITMENT_EMAIL", `Project ${this.project.PROJECT_NUMBER} has been reopened`, textForManagers)
        }
    }
}
</script>

<style scoped>
#subprojects-list {
    padding: 10px;
    border: thin solid lightgray;
    border-radius: 5px;
    background-color: white;
    min-width: 230px;
    margin-right: 10px;
    height: 100%;
}

.subproject-row {
    padding-bottom: 10px;
}
</style>
