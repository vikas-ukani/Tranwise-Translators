<template lang="pug">
.chat-messages-wrapper(ref="ChatMessagesWrapper" :style="{ height: $attrs.small ? '0' : '100%'}")
    .request-history
        .ui.button.tiny(@click="requestChatHistory" style="padding: 4px 8px !important; font-size: 10px !important" v-show="partner && !partner.chatHistoryStatus") Show older messages
        div(v-show="partner && partner.chatHistoryStatus === 1")
            .ui.active.inline.mini.loader(style="display: inline-block")
            div(style="font-size: 11px; padding-left: 10px; display: inline-block") Loading older messages...
        div(v-show="partner && partner.chatHistoryStatus === 3" style="font-size: 11px") No older messages found
    div(v-if="$attrs.small" style="height: 10px")
    .message-row(v-for="message in messages" :class="{ small : $attrs.small}")
        .spacer-before(v-if="message.senderID === ownID")
        .time-before(v-if="message.senderID === ownID") {{ message.timeText || utils.formatDate(message.time, "HH:mm") }}
        .message(:class="{ own: message.senderID === ownID, other: message.senderID !== ownID }") {{ message.text }}
        .time-after(v-if="message.senderID !== ownID") {{ message.timeText || utils.formatDate(message.time, "HH:mm") }}
        .spacer-after(v-if="message.senderID !== ownID")
    .partner-offline(v-if="partnerIsOfflineMessage") {{ partnerIsOfflineMessage }}
    .partner-offline-send-message(v-if="partnerIsOfflineMessage" @click="sendMessageToEmployee") Click here to send an offline message instead
    .partner-typing(v-else) {{ partnerTypingStatus }}
</template>

<script>
import store from "../StoreBase"
import utils from "../UtilsBase"
import cmg from "../ConnectionManagerBase"

export default {
    props: {
        partner: Object
    },

    data() {
        return {
            messagesRefresher: 0
        }
    },

    computed: {
        ownID() {
            if (!store.myself) return 0
            return store.myself.PK
        },

        messages() {
            if (this.messagesRefresher) {
            }

            if (!this.partner) return []
            const result = []

            if (store.chat.history[this.partner.PK]) result.push(...store.chat.history[this.partner.PK])
            result.push(...store.chat.messages.filter(message => message.partner === this.partner))

            return result
        },

        partnerIsOfflineMessage() {
            if (!this.partner) return ""
            if (this.partner.canChat()) return ""
            return this.partner.FIRST_NAME + " is offline or away and might not receive your messages"
        },

        partnerTypingStatus() {
            if (!this.partner) return ""
            return this.partner.isTyping ? "typing..." : ""
        }
    },

    methods: {
        scrollToBottom(force) {
            const el = this.$refs.ChatMessagesWrapper
            const wasAtTheBottom = el.scrollHeight - el.clientHeight <= el.scrollTop + 1
            // Scroll to bottom only if it was previously at the bottom (or if force is true)
            if (wasAtTheBottom || force)
                this.$nextTick(() => {
                    el.scrollTop = el.scrollHeight - el.clientHeight
                })
        },

        sendMessageToEmployee() {
            store.composeAndSendEmployeeMessage(this.partner)
        },

        requestChatHistory() {
            if (!this.partner) return ""
            this.$set(this.partner, "chatHistoryStatus", 1)
            cmg.requestChatHistory(this.partner.PK)
        }
    },

    created() {
        this.store = store
        this.utils = utils

        store.eventBus.$on("receivedChatHistory", partnerID => {
            // Set the received status on the partner
            const partner = store.employee(partnerID)
            if (partner) this.$set(partner, "chatHistoryStatus", store.chat.history[partnerID].length ? 2 : 3)

            // Update the messages list
            if (this.partner && this.partner.PK === partnerID) this.messagesRefresher++
        })
    },

    watch: {
        messages() {
            this.scrollToBottom()
        },

        partnerTypingStatus() {
            this.scrollToBottom()
        },

        partnerIsOfflineMessage() {
            this.scrollToBottom()
        }
    }
}
</script>

<style scoped>
.chat-messages-wrapper {
    flex: 1 1 auto;
    overflow: auto;
}

.message-row {
    display: flex;
    padding: 0 10px;
}

.partner-typing {
    padding: 0px 10px 15px 20px;
    font-size: 12px;
    color: rgb(129, 145, 160);
}

.partner-offline {
    text-align: center;
    padding-top: 10px;
    font-size: 12px;
    color: rgb(185, 58, 58);
}

.request-history {
    text-align: center;
    padding: 12px;
}

.partner-offline-send-message {
    text-align: center;
    padding: 10px 0;
    font-size: 12px;
    text-decoration: underline;
    color: rgb(97, 53, 53);
    cursor: pointer;
}

.message {
    margin: 10px;
    padding: 12px 15px;
    border-radius: 5px;
    min-width: 100px;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    font-size: 12px;
    white-space: pre-line;
}

.message-row.small .message {
    padding: 8px 12px;
    margin: 6px;
}

.message-row.small .time-before {
    margin: 5px 3px 4px 10px;
}

.message-row.small .time-after {
    margin: 5px 10px 4px 3px;
}

.message-row {
    display: flex;
    padding: 0 5px;
}

.spacer-before {
    flex: 1 1 auto;
}

.spacer-after {
    flex: 1 1 auto;
}

.message.own {
    background-color: #e4f3f7;
}

.message.other {
    background-color: #f0edf4;
}

.time-before,
.time-after {
    padding: 10px 0px;
    font-size: 12px;
    color: rgb(129, 147, 155);
    flex: 0 0 auto;
}

.time-before {
    margin: 10px 3px 10px 10px;
}

.time-after {
    margin: 10px 10px 10px 3px;
}
</style>
