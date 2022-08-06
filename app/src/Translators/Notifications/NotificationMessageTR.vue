<template lang="pug">
div(style="width: 400px")
    #notification-title(v-if="options.title") {{ options.title }}
    #notification-note(v-if="options.note") <em>{{ options.note }}</em>
    #notification-message(v-if="options.message") {{ options.message }}
    #notification-buttons
        .ui.button.coolblue(v-if="subproject" @click="goToSubproject") Go to project
        .ui.button.coolblue(v-if="options.employeeFile" @click="downloadEmployeeFile") Download file
        .ui.button.coolblue(v-if="options.goToEmployeesMessages" @click="goToEmployeesMessages") Go to messages
        .ui.button.coolblue(v-if="options.markMessageAsRead" @click="markMessageAsRead") Mark message as read
</template>

<script>
import store from "../Store/StoreTR"
import cmg from "../ConnectionManagerTR"

export default {
    props: {
        options: Object
    },

    computed: {
        subproject() {
            return store.subproject(this.options.subprojectID)
        }
    },

    methods: {
        goToSubproject() {
            this.options.closePopup && this.options.closePopup()
            store.goToObject(this.subproject)
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
    white-space: pre-wrap;
}

#notification-note {
    font-size: 11px;
    padding-top: 8px;
    white-space: pre-wrap;
}

#notification-message {
    font-size: 12px;
    padding-top: 20px;
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


