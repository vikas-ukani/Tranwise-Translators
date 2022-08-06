<template lang="pug">
#projects-messages-list-wrapper
    .message-list-item(v-for="m in messages" @click="selectMessage(m)" :class="{selected: m.PK == selectedMessage.PK}")
        .problem-tag-wrapper
            img(:src="messageStatusIcon(m)" width="15" @click="toggleProblem(m)")
        div
            .line1(style="white-space: nowrap") {{ m.sender() }} » {{ m.recipient() }}
            .line2 
                span.message-date {{ messageDate(m) }}
                span {{ m.messageText().replace(/\n/g, " ") }}
</template>

<script>
import { cmg, store, utils } from "../../CoreModules"
import ProjectComponentsMixin from "./ProjectComponentsMixin"

export default {
    mixins: [ProjectComponentsMixin],

    props: {
        messages: Array,
        selectedMessage: { type: Object, default: () => {} }
    },

    methods: {
        selectMessage(message) {
            this.$emit("selectProjectMessage", message)
        },

        messageDate(message) {
            let format = "DD MMM YYYY HH:mm"
            if (utils.isThisYear(message.MESSAGE_TIME)) format = "DD MMM, HH:mm"
            return utils.formatDate(message.MESSAGE_TIME, format)
        },

        messageStatusIcon(message) {
            if (message.IS_PROBLEM) return "/static/icons/Projects/ProjectsMessages/ProjectMessageStatusProblem.svg"
            else return "/static/icons/Projects/ProjectsMessages/ProjectMessageStatusDone.svg"
        },

        toggleProblem(message) {
            const newValue = !message.IS_PROBLEM
            cmg.updateObject(message, "IS_PROBLEM", newValue)
            if (!newValue) {
                cmg.updateObject(message, "COMPLETED_BY", store.myself.PK)
                cmg.updateObject(message, "COMPLETED_TIME", "SERVER_TIME_TAG")
            }
        }
    }
}
</script>

<style scoped>
#projects-messages-list-wrapper {
    flex-grow: 0;
    border: thin solid rgb(177, 177, 177);
    border-radius: 5px;
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