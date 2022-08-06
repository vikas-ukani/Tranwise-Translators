<template lang="pug">
#projects-deliveries-page-wrapper.ui.form 
    #projects-deliveries-contents-wrapper
        #files-wrapper
            ProjectFiles(:project="project" screen="Deliveries")
        #middle-row
            .fields.inline
                .field
                    .ui.button.coolblue.tiny(@click="updateDeliveryComments") Delivery comments
                .field
                    TWCheckbox(label="Is delivered" :obj="project" field="IS_DELIVERED" :change="updateProject")
                .field(v-if="project.DIGITAL_CERTIFICATION_STATUS")
                    TWCheckbox(label="Digicert sent" :value="project.DIGITAL_CERTIFICATION_STATUS === 2" :change="updateDigitalCertificationSent")
                .field(:style="styleOfDCTag" style="font-weight: 700; padding-right: 3px") DC
                .field(:style="styleOfNTTag" style="font-weight: 700" ) ▪ NT
                .field(style="padding-left: 10px" v-if="showRequestPOFile")
                    .ui.button.purple.tiny(@click="requestPOFile") Request PO file
            .field
                .ui.button.basic.purple.tiny(style="margin: 0 20px" v-if="instructionsForTranslators" @click="showInstructionsForTranslators") Show client's details for translators 
            .field
                .ui.button.basic.teal.tiny(style="margin-left: 0" v-if="project.translatorsComments()" @click="showTranslatorsComments") Show translators' comments
        #bottom-row
            EditableDiv(style="padding-right: 0px; margin-right: 10px; border-right: thin solid #e3e3e3;" :rows="4" title="Translators" :obj="project" field="SPECIAL_INSTRUCTIONS" :change="updateProject")              
            EditableDiv(style="padding: 0 10px" :rows="4" title="Project managers" :obj="project" field="WORK_DETAILS" :change="updateProject")              
            ProjectAssignedTranslators(:project="project")
                    
</template>

<script>
import { store, cmg, constants as C_ } from "../CoreModules"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import ProjectFiles from "./Components/ProjectFiles"
import ProjectAssignedTranslators from "./Components/ProjectAssignedTranslators"
import EditableDiv from "../EditableDiv"

export default {
    props: {
        project: Object
    },

    components: {
        ProjectFiles,
        ProjectAssignedTranslators,
        EditableDiv
    },

    computed: {
        instructionsForTranslators() {
            if (!this.project.client()) return ""
            const result = this.project.client().INSTRUCTIONS_FOR_TRANSLATORS
            return result ? result.trim() : ""
        },

        showRequestPOFile() {
            const client = this.project.client()
            if (!client || !client.IS_INVOICED_ONLINE) return false
            let hasPOFile = false
            store.projectsFiles.forEach(file => {
                if (file.PROJECT_ID === this.project.PK && file.FILE_TYPE === C_.pfClientPO) hasPOFile = true
            })
            return !hasPOFile
        },

        styleOfDCTag() {
            const dcService = this.project.services().filter(s => s.SERVICE_TYPE === C_.psDigitalCertification)[0]
            if (!dcService) return { display: "none" }
            return { color: dcService.IS_PAID || dcService.WAS_INITIAL ? "#00cc00" : "red" }
        },

        styleOfNTTag() {
            const ntService = this.project.services().filter(s => s.SERVICE_TYPE === C_.psNotarization)[0]
            if (!ntService) return { display: "none" }
            return { color: ntService.IS_PAID || ntService.WAS_INITIAL ? "#00cc00" : "red" }
        }
    },

    methods: {
        updateProject(field, value) {
            cmg.updateObject(this.project, field, value)
        },

        updateDigitalCertificationSent(field, value) {
            this.updateProject("DIGITAL_CERTIFICATION_STATUS", value ? 2 : 1)
        },

        showInstructionsForTranslators() {
            this.$showMessage(this.instructionsForTranslators)
        },

        showTranslatorsComments() {
            this.$showMessage(this.project.translatorsComments())
        },

        async updateDeliveryComments() {
            const response = await this.$showDialog({
                header: "Delivery comments",
                message: `Update the delivery comments for project ${this.project.PROJECT_NUMBER}:`,
                textAreaText: this.project.DELIVERY_COMMENTS,
                buttons: ["Cancel", "Save"],
                buttonClasses: ["", "positive"]
            })

            if (response.selection === "Save") {
                cmg.updateObject(this.project, "DELIVERY_COMMENTS", response.text)
            }
        },

        async requestPOFile() {
            const proj = this.project
            const client = this.project.client()
            if (this.$checkWithMessage(!client, "This project does not have the client set. Please correct this before sending the email.")) return
            const division = client.division()
            if (this.$checkWithMessage(!division, "This client's division is not set. Please correct this before sending the email.")) return

            const text =
                `Dear client,\n\nWe have completed the translation for your project "${proj.CLIENT_ORDER_NUMBER}" (our project ${proj.PROJECT_NUMBER})\n\n` +
                "However, we have not received your PO. Please send us the PO as soon as possible, so we can complete the project.\n\nThank you!"

            const response = await this.$showDialog({
                header: "Ask the client to send the PO",
                message: "Ask the client to send the PO:",
                textAreaText: text,
                blankTextWarning: "Please provide a text for the email",
                buttons: ["Cancel", "Send email"],
                buttonClasses: ["", "positive"]
            })

            if (response.selection != "Send email" || !response.text) return
            cmg.sendEmail(division.EMAIL, proj.PROJECT_EMAIL, `Please send the PO for project "${proj.CLIENT_ORDER_NUMBER}" (no. ${proj.PROJECT_NUMBER})`, response.text)
            let historyText = proj.REQUEST_PO_HISTORY
            if (historyText) historyText += ","
            historyText += "$SERVER_TIME_AT$"
            this.updateProject("REQUEST_PO_HISTORY", historyText)
        }
    }
}
</script>

<style scoped>
#projects-deliveries-page-wrapper {
    width: 100%;
    height: 100%;
    padding: 0 20px;
}

#projects-deliveries-contents-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
}

#files-wrapper {
    flex: 1 1 auto;
}

#work-details {
    margin-right: 10px;
}

#middle-row {
    display: flex;
}

#bottom-row {
    margin-top: 5px;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    flex: 1 1 auto;
    max-height: 140px;
}
</style>
