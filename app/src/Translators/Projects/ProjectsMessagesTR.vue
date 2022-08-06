<template lang="pug">
#projects-messages-wrapper
    div(v-if="!messages.length" style="display: flex; margin-top: 10px") 
        div(style="flex-grow: 1; padding-top: 5px") There are no messages about this project.
        .ui.button.teal.tiny(v-if="shouldShowComposeButton" @click="composeMessage") Compose message
    div(v-else)
        div(style="padding-bottom: 5px; display: flex; border-bottom: thin solid rgba(34,36,38,.15); margin-bottom: 10px")
            div(style="flex-grow: 1; font-weight: 700; font-size: 1rem; padding-top: 13px") Messages
            .ui.button.teal.tiny(v-if="shouldShowComposeButton" @click="composeMessage") Compose message
        div(v-if="messages.length" style="height: 150px; display: flex")
            div(style="width: 50%; height: 100%; display: flex; flex-direction: column")
                ProjectMessagesList(:messages="messages" :selectedMessage="message" @selectProjectMessage="selectMessage")
            .ui.form(style="width: 50%; padding-left: 10px")
                TWTextArea(readonly style="height: 100%; width: 100%" :value="message.PK && message.MESSAGE")
    ProjectMessagesCompose(ref="composeDialog" :project="project" :subproject="subproject" :translation="translation")
</template>

<script>
import ProjectMessagesCompose from "./ProjectsMessagesComposeTR"
import ProjectMessagesList from "./ProjectsMessagesListTR"
import store from "../Store/StoreTR"
import C_ from "../ConstantsTR"
import cmg from "../ConnectionManagerTR"

export default {
    components: {
        ProjectMessagesCompose,
        ProjectMessagesList
    },

    props: {
        project: { type: Object, default: () => {} },
        subproject: { type: Object, default: () => {} },
        translation: { type: Object, default: () => {} }
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
            return store.projectsMessages
                .filter(m => {
                    if (m.SENDER != store.myself.PK && m.RECIPIENT != store.myself.PK) return false
                    if (m.SENDER === "C2T") return false
                    return m.PROJECT_ID === this.project.PK
                })
                .sort((a, b) => b.PK - a.PK)
        },

        shouldShowComposeButton() {
            if (this.project.STATUS === C_.psCancelled) return false
            if (![C_.tsTranslating, C_.tsProofreading].includes(this.translation.STATUS)) return false
            return true
        }
    },

    methods: {
        selectMessage(message) {
            this.message = message
            if (!message.IS_READ) cmg.updateObject(message, "IS_READ", true)
        },

        messageDate(message) {
            let format = "DD MMM YYYY HH:mm"
            if (utils.isThisYear(message.MESSAGE_TIME)) format = "DD MMM, HH:mm"
            return utils.formatDate(message.MESSAGE_TIME, format)
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
    padding: 10px 20px 20px 20px;
    border-top: thin solid rgb(149, 159, 165);
    background-color: #f3fafd;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
}

#projects-messages-buttons-row {
    margin-bottom: 10px;
}

#messages-wrapper {
    flex-grow: 0;
    border: 1px solid grey;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: white;
}

.message-list-item {
    height: 54px;
    border-bottom: 1px solid rgb(202, 202, 202);
    display: flex;
    padding-top: 5px;
    cursor: pointer;
}

.message-list-item.selected {
    background-color: rgb(234, 243, 243);
}

.message-list-item .line1 {
    padding-top: 3px;
    font-weight: 700;
    font-size: 12px;
}

.message-list-item .line2 {
    font-size: 12px;
    padding-top: 2px;
    width: 300px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.message-date {
    color: rgb(158, 152, 152);
    padding-right: 15px;
}

.problem-tag-wrapper {
    padding: 12px 8px 0 6px;
}
</style>