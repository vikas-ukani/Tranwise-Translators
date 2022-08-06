<template lang="pug">
#modal-create-project.ui.longer.modal(style="width: 950px")
    .header(style="display: flex")
        div(style="padding-top: 5px") Create quote
        div(style="flex-grow: 1") 
        .ui.small.purple.button(@click="quoteSaveDraft") Save draft
        .ui.small.black.button(style="margin-left: 20px" @click="quoteReset") Reset form
        .ui.small.grey.button(style="margin-left: 20px" @click="quoteCancel") Cancel
    #projects-create-scrolling-content.scrolling.content
        ProjectsCreate(ref="ProjectsCreate" @receivedInsertedProject="receivedInsertedProject")
</template>

<script>
import store from "../../Store/Store"
import CoreMixin from "../../../Shared/Mixins/CoreMixin"
import ProjectsCreate from "./ProjectsCreate"

export default {
    mixins: [CoreMixin],

    components: { ProjectsCreate },

    methods: {
        show() {
            this.$refs.ProjectsCreate.resetForm(store.draftQuote)
            this.showModal("#modal-create-project")
            // Reset the form again with a little delay, otherwise the calendars don't work
            setTimeout(() => {
                this.$refs.ProjectsCreate.resetForm(store.draftQuote)
            }, 100)
        },

        showForPrequote(prequote) {
            this.$refs.ProjectsCreate.resetForPrequote(prequote)
            this.showModal("#modal-create-project", { autofocus: false })
            this.$refs.ProjectsCreate.initializeCalendars()
        },

        showForTwilioMessage(twilioMessage) {
            // Prepare the special instructions for the translators
            let specialInstructions = ""
            if (twilioMessage.ATTACHMENT_LINKS) {
                if (twilioMessage.ATTACHMENT_LINKS.includes("\n"))
                    specialInstructions = "The source files to be translated are images, which can be downloaded from the links below:\n\n" + twilioMessage.ATTACHMENT_LINKS
                else specialInstructions = "The source file to be translated is an image, which can be downloaded from this link:\n\n" + twilioMessage.ATTACHMENT_LINKS
            }

            // Create a dummy draft with the details from Twilio, to be loaded when showing the form
            const draftQuote = {
                project: {
                    PROJECT_EMAIL: store.Settings("EMAIL_FOR_TWILIO_PROJECTS"),
                    TWILIO_STATUS: twilioMessage.IS_WHATSAPP ? 2 : 1,
                    WORK_DETAILS: twilioMessage.MESSAGE,
                    SPECIAL_INSTRUCTIONS: specialInstructions,
                    CLIENT_ID: twilioMessage.client.PK
                },
                client: twilioMessage.client
            }

            // Show the quote creation form
            this.$refs.ProjectsCreate.resetForm(draftQuote)
            this.showModal("#modal-create-project", { duration: 300 })
            this.$refs.ProjectsCreate.initializeCalendars()
        },

        quoteSaveDraft() {
            this.$refs.ProjectsCreate.saveDraft()
        },

        quoteCancel() {
            this.$refs.ProjectsCreate.cancelQuoteCreation()
        },

        async quoteReset() {
            if (await this.$dialogCheck("Do you want to reset the entire form?")) this.$refs.ProjectsCreate.resetForm()
        },

        receivedInsertedProject(insertedProject) {
            this.$emit("receivedInsertedProject", insertedProject)
        }
    }
}
</script>

<style scoped>
#projects-create-scrolling-content {
    max-height: calc(85vh) !important;
}
</style>
