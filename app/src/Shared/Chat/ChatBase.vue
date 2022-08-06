<template lang="pug">
#chat-base-wrapper 
    #partners
        .chat-partner-box(v-for="partner in partners" @click="selectPartner(partner)" :class="partner === activePartner && 'selected'")
            .chat-partner-box-close-icon(@click.stop="deletePartner(partner)") ×
            .chat-partner-box-online-icon(:class="['online-status-' + partner.ONLINE_STATUS]")
                i.user.icon.small
            .chat-partner-box-name(:class="{'has-new-messages' : partner.hasNewMessages && partner != activePartner }") {{ partner.fullName() }}
            .chat-partner-box-typing
                i.comment.alternate.icon(v-show="partner.isTyping")
    .partner-name {{ partnerName }}
    .empty-chat-pane(v-if="!activePartner.PK") {{ partners.length ? "Select a chat partner at the top" : "Chat messages will show up here"  }}
    div(style="flex: 1 1 auto; height: 0")
        MessagesPane(ref="MessagesPane" v-if="activePartner.PK" :partner="activePartner")
    div(style="flex: 0 1 auto")
        Editor(ref="ChatEditor" v-show="activePartner.PK" :partner="activePartner" @sentMessage="onSentMessage")
</template>

<script>
import store from "../StoreBase"
import utils from "../UtilsBase"
import cmg from "../ConnectionManagerBase.js"
import MessagesPane from "./MessagesPane"
import Editor from "./Editor"

export default {
    components: {
        MessagesPane,
        Editor
    },

    props: {
        isVisible: Boolean
    },

    data() {
        return {
            activePartner: {}
        }
    },

    computed: {
        ownID() {
            if (!store.myself) return 0
            return store.myself.PK
        },

        partnerName() {
            if (!this.activePartner.PK) return ""
            return this.activePartner.fullName()
        },

        partners() {
            return store.chat.partners
        }
    },

    methods: {
        selectPartner(partner) {
            if (this.activePartner) this.$set(this.activePartner, "hasNewMessages", false)
            this.activePartner = partner
            if (partner) this.$set(partner, "hasNewMessages", false)
            this.$refs.ChatEditor.setTypedText(partner ? partner.typedText : "")
        },

        deletePartner(partner) {
            if (this.activePartner === partner) this.$set(this, "activePartner", {})
            store.deleteChatPartner(partner.PK)
            this.$refs.ChatEditor.setTypedText("")
        },

        onSentMessage() {
            this.$refs.MessagesPane.scrollToBottom(true)
        }
    },

    created() {
        this.store = store
        this.utils = utils
        store.eventBus.$on("activateChat", partner => {
            this.selectPartner(partner)
            if (this.isVisible) this.$refs.ChatEditor.focus()
        })
        store.eventBus.$on("receivedChatMessage", partner => {
            if (!this.isVisible) return
            if (document.visibilityState != "visible" && !document.title.includes("• ")) document.title = "• " + document.title
            if (document.visibilityState != "visible" || partner != this.activePartner) store.playChatSound(this.chatSound)
        })
        this.chatSound = new Audio("/static/sounds/SoundChat.mp3")
    },

    watch: {
        partners() {
            if (this.partners.length && !this.activePartner.PK) this.selectPartner(this.partners.slice(-1)[0])
        }
    }
}
</script>

<style scoped>
#chat-base-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
    border-left: thin solid rgb(213, 229, 235);
}

.partner-name {
    padding: 20px 10px 10px 10px;
    text-align: center;
    font-weight: 600;
    font-size: 13px;
}

#header {
    display: flex;
    background-color: rgb(124, 182, 182);
}

#title {
    font-weight: 700;
    padding: 10px;
    flex: 1 1 auto;
}

#partners {
    background-color: rgb(250, 250, 250);
    display: grid;
    align-items: center;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.empty-chat-pane {
    flex: 1 1 auto;
    text-align: center;
    padding-top: 100px;
    color: rgb(140, 155, 155);
}

.chat-partner-box {
    padding: 10px;
    background-color: rgb(252, 252, 252);
    display: flex;
    cursor: pointer;
    border-bottom: thin solid #eee;
    border-right: thin solid #eee;
}

.chat-partner-box.selected {
    background-color: rgb(239, 233, 241);
    box-shadow: inset 0px 0px 0px 1px rgb(193, 171, 209);
}

.chat-partner-box-online-icon {
    padding-right: 2px;
}

.chat-partner-box-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.chat-partner-box-name.has-new-messages {
    font-weight: 700;
}

.chat-partner-box-online-icon.online-status-0 {
    color: rgb(207, 205, 199);
}

.chat-partner-box-online-icon.online-status-1 {
    color: rgb(252, 198, 52);
}

.chat-partner-box-online-icon.online-status-2 {
    color: rgb(162, 221, 223);
}

.chat-partner-box-online-icon.online-status-3 {
    color: rgb(155, 125, 202);
}

.chat-partner-box-typing {
    padding-left: 10px;
    color: rgb(190, 188, 190);
}

.chat-partner-box-close-icon {
    color: rgb(187, 184, 184);
    font-weight: 700;
    font-size: 18px;
    padding-right: 5px;
    line-height: 20px;
    cursor: pointer;
}

#main-chat {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    background-color: rgb(227, 249, 255);
}
</style>

