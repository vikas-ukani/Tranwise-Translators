<template lang="pug">
#projects-reopened-page-wrapper
    #project-not-reopened(v-if="project.STATUS != C_.psReopened") This project is not reopened
    .ui.form#projects-reopened-contents-wrapper(v-else)
        #reopened-languages
            .fields.inline(v-if="!$attrs.hideFilter")
                .field
                    label Reopened languages:
                .field
                    .ui.small.input
                        input(type="text" readonly :value="reopenedLanguages" placeholder="No reopened languages" style="width: 300px") 
                .field(v-if="hasLanguagesNotReopened")
                    .ui.small.basic.teal.button(style="padding: 8px 12px !important" @click="reopenMoreLanguages") Reopen more languages
        #files-wrapper
            ProjectFiles(:project="project" hideFilter :fileTypes="[6, 7, 8, 9, 10]" screen="Reopened")
        #middle-row
            div(style="margin-right: 10px")
                .field
                    label Client's comments
                    TWTextArea(:rows="5" :obj="project" field="REOPEN_COMMENTS" :change="updateProject")   
            div(style="margin-right: 10px")
                .field
                    label Translator's comments
                    textarea(readonly rows="5") {{ translatorsComments }}
            div
                .field
                    label Response for client (is sent with file)
                    TWTextArea(:rows="5" :obj="project" field="REOPEN_RESPONSE" :change="updateProject")   
        #bottom-row
            div(style="margin-right: 10px")
                .field
                    label Updates on the project
                    TWTextArea(:rows="5" :obj="project" field="REOPEN_UPDATES" :change="updateProject")   
            #projects-messages-reopened-wrapper(style="width: 250px; padding-bottom: 14px")
                div(style="padding-bottom: 4px") Messages
                ProjectMessagesList(:messages="messages" :selectedMessage="{}" @selectProjectMessage="selectProjectMessage")
            #assigned-translators(style="height: 100%; max-height: 140px")
                .field(style="margin-bottom: 0px")
                    label Assigned translators
                ProjectAssignedTranslators(:project="project" showConfirmedStatus)
</template>

<script>
import { store, cmg, constants as C_ } from "../CoreModules"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import ProjectFiles from "./Components/ProjectFiles"
import ProjectAssignedTranslators from "./Components/ProjectAssignedTranslators"
import ProjectMessagesList from "./Components/ProjectMessagesList"

export default {
    props: {
        project: Object
    },

    data() {
        return {
            hasLanguagesNotReopened: false
        }
    },

    components: {
        ProjectFiles,
        ProjectMessagesList,
        ProjectAssignedTranslators
    },

    created() {
        this.C_ = C_
    },

    computed: {
        translatorsComments() {
            return this.project.translatorsComments()
        },

        reopenedLanguages() {
            let hasLanguagesNotReopened = false
            let languages = ""
            this.project.subprojects().forEach(subproject => {
                if (subproject.IS_REOPENED) languages += store.languageName(subproject.LANGUAGE_ID) + ", "
                else hasLanguagesNotReopened = true
            })

            this.hasLanguagesNotReopened = hasLanguagesNotReopened
            return languages.slice(0, -2)
        },

        messages() {
            return store.projectsMessages.filter(m => m.PROJECT_ID === this.project.PK && (m.SENDER === "CLR" || m.RECIPIENT === "CLR")).sort((a, b) => b.PK - a.PK)
        }
    },

    methods: {
        updateProject(field, value) {
            cmg.updateObject(this.project, field, value)
        },

        async updateDeliveryComments() {
            const response = await this.$showDialog({
                header: "Delivery comments",
                message: `Update the delvery comments for project ${this.project.PROJECT_NUMBER}:`,
                textAreaText: this.project.DELIVERY_COMMENTS,
                buttons: ["Cancel", "Save"],
                buttonClasses: ["", "positive"]
            })

            if (response.selection === "Save") {
                cmg.updateObject(this.project, "DELIVERY_COMMENTS", response.text)
            }
        },

        selectProjectMessage(message) {
            this.$showMessage("View message", message.messageText())
        },

        async reopenMoreLanguages() {
            const languages = []
            this.project.subprojects().forEach(subproject => {
                if (!subproject.IS_REOPENED) languages.push({ PK: subproject.PK, LANGUAGE: subproject.languageName() })
            })

            const response = await this.$showDialog({
                message: "Select a target language to reopen:",
                dropdownDefaultText: "Select a target language",
                dropdownItems: languages,
                dropdownKey: "LANGUAGE",
                dropdownField: "PK"
            })

            if (response.selection === "OK") {
                const selectedSubproject = store.subproject(response.value)
                cmg.updateObject(selectedSubproject, "IS_REOPENED", true)

                this.project.assignedTranslations().forEach(translation => {
                    if (translation.SUBPROJECT_ID != selectedSubproject.PK) return

                    const message = `THE CLIENT CAME BACK WITH QUESTIONS ABOUT PROJECT ${this.project.PROJECT_NUMBER}. Please check the project's details page to read the comments at the top of the instructions for the project and respond accordingly.`
                    store.sendEmployeeMessage(translation.employee(), message)
                    cmg.sendMessage(cmg.messageHeaders.SEND_TELEGRAM_TO_EMPLOYEE, translation.employee().PK, message)
                })
            }
        }
    }
}
</script>

<style scoped>
#projects-reopened-page-wrapper {
    width: 100%;
    padding: 0 20px;
    height: 100%;
}

#projects-reopened-contents-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
}

#project-not-reopened {
    color: grey;
    height: 100%;
    display: grid;
    align-items: center;
    justify-content: center;
    padding-top: 100px;
}

#files-wrapper {
    flex: 1 1 auto;
}

#middle-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    padding-bottom: 10px;
}

#bottom-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    height: 130px;
    max-height: 130px;
}

#assigned-translators {
    display: flex;
    flex-direction: column;
}

#projects-messages-reopened-wrapper {
    margin-right: 10px;
    height: 100%;
    max-height: 130px;
}
</style>
