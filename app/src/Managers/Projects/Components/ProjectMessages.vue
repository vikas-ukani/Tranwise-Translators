<template lang="pug">
#projects-messages-wrapper
    #projects-messages-buttons-row
        div(style="display: flex")
            div(style="width: 50%")
                .ui.button.coolgreen.tiny(@click="composeMessage") Compose message
            div(style="width: 25%; padding-left: 10px")
                .ui.button.coolblue.tiny(v-if="shouldShowApproveButtons" @click="editMessage") Edit & approve
            div(style="width: 25%")
                .ui.button.teal.tiny(v-if="shouldShowApproveButtons" @click="approveMessage") Approve
    div(style="height: 100%; padding: 0; margin-bottom: 0; display: flex")
        div(style="width: 50%; height: 100%; display: flex; flex-direction: column")
            ProjectMessagesList(:messages="messages" :selectedMessage="message" @selectProjectMessage="selectMessage")
        .ui.form(style="width: 50%; padding-left: 10px")
            TWTextArea(readonly style="height: 100%; width: 100%" :value="message.PK && message.messageText()")
    ProjectMessagesCompose(ref="composeDialog" :project="project")
</template>

<script>
import { cmg, store, utils } from "../../CoreModules"
import ProjectComponentsMixin from "./ProjectComponentsMixin"
import ProjectMessagesCompose from "./ProjectMessagesCompose"
import ProjectMessagesList from "./ProjectMessagesList"

export default {
    mixins: [ProjectComponentsMixin],

    components: {
        ProjectMessagesCompose,
        ProjectMessagesList
    },

    data() {
        return {
            message: {},
            newMessage: { recipient: "", text: "" },
            newMessageRecipients: []
        }
    },

    computed: {
        messages() {
            return this.store.projectsMessages
                .filter(m => m.PROJECT_ID === this.project.PK && m.SENDER != "CCM" && !["CCM", "FC", "FCY", "FCN"].includes(m.RECIPIENT))
                .sort((a, b) => b.PK - a.PK)
        },

        shouldShowApproveButtons() {
            if (!this.message.PK) return false
            if (this.message.SENDER === store.myself.PK) return false
            return this.message.RECIPIENT === "T2C" || this.message.SENDER === "C2T"
        }
    },

    methods: {
        selectMessage(message) {
            this.message = message
        },

        editMessage(message) {
            store.editAndApproveProjectMessage(this.message)
        },

        approveMessage() {
            store.approveProjectMessage(this.message)
        },

        composeMessage() {
            this.$refs.composeDialog.show()
        }
    },

    watch: {
        project(newValue, oldValue) {
            if (newValue !== oldValue) this.message = {}
        }
    }
}
</script>

<style scoped>
#projects-messages-wrapper {
    padding-top: 10px;
    height: 100%;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
}

#projects-messages-buttons-row {
    margin-bottom: 10px;
}
</style>