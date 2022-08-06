<template lang="pug">
#projects-messages-list-wrapper
    .message-list-item(v-for="m in messages" @click="selectMessage(m)" :class="{selected: m.PK == selectedMessage.PK}")
        .line1(style="white-space: nowrap") {{ m.sender() }} » {{ m.recipient() }}
        .line2 
            span.message-date {{ messageDate(m) }}
            span {{ m.MESSAGE.replace(/\n/g, " ") }}
</template>

<script>
import utils from "../UtilsTR"

export default {
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
    padding-top: 5px;
    padding-left: 10px;
    cursor: pointer;
    background-color: rgb(252, 252, 255);
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
</style>