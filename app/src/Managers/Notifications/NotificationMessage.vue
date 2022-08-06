<template lang="pug">
div(style="width: 400px")
    #notification-title(v-if="options.title") {{ options.title }}
    #notification-message(v-if="options.message") {{ options.message }}
    #notification-buttons
        .ui.button.coolblue(v-if="project" @click="goToProject") Go to project
        .ui.button.coolblue(v-if="twilioMessage" @click="goToTwilioMessage") Go to Twilio message
        .ui.button.coolblue(v-if="options.employeeFile" @click="downloadEmployeeFile") Download file
        .ui.button.coolblue(v-if="options.goToEmployeesMessages" @click="goToEmployeesMessages") Go to messages
        .ui.button.coolblue(v-if="options.markMessageAsRead" @click="markMessageAsRead") Mark message as read
</template>

<script>
import store from "../Store/Store"
import cmg from "../ConnectionManager"

export default {
    props: {
        options: Object
    },

    computed: {
        project() {
            return store.project(this.options.projectID)
        },

        twilioMessage() {
            return store.twilioMessage(this.options.twilioMessageID)
        }
    },

    methods: {
        goToProject() {
            this.options.closePopup && this.options.closePopup()
            store.goToObject(this.project)
        },

        goToTwilioMessage() {
            this.options.closePopup && this.options.closePopup()
            store.goToObject(this.twilioMessage)
        },

        goToEmployeesMessages() {
            this.options.closePopup && this.options.closePopup()
            store.eventBus.$emit("goToPage", "EmployeesMessagesBase")
        },

        markMessageAsRead() {
            this.options.closePopup && this.options.closePopup()
            cmg.updateObject(this.options.employeeMessage, "IS_READ", true)
        },

        downloadEmployeeFile() {
            cmg.updateObject(this.options.employeeFile, "IS_DOWNLOADED", true)
            this.$downloadFile(this.options.employeeFile, "Received files")
            store.eventBus.$emit("showDownloadProgress", this.options.employeeFile)
            this.options.closePopup && this.options.closePopup()
        }
    }
}
</script>

<style scoped>
#notification-title {
    font-weight: 600;
    padding-bottom: 20px;
    white-space: pre-wrap;
}

#notification-message {
    font-size: 12px;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 10px;
    overflow-wrap: break-word;
    white-space: pre-wrap;
}

#notification-message::-webkit-scrollbar {
    width: 3px;
}

#notification-buttons {
    text-align: center;
    padding: 10px;
}
</style>


