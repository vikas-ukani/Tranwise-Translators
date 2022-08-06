<template lang="pug">
div
    #chat-minimized-wrapper(v-show="!isMaximized" @click="maximize")
        #chat-minimized-title {{ minimizedTitle }}
        .chat-header-icons
            i.volume.up.icon.clickable(:style="{opacity: chatSoundsAreDisabled ? 0.2 : 1}" style="padding-right: 20px" @click.stop="toggleSounds")
            i.up.arrow.icon.clickable
    #chat-window-wrapper(v-show="isMaximized")
        #chat-window-header
            #chat-window-title Chat
            .chat-header-icons
                i.volume.up.icon.clickable(:style="{opacity: chatSoundsAreDisabled ? 0.2 : 1}" style="padding-right: 30px" @click="toggleSounds")
                i.down.arrow.icon.clickable(v-if="isMaximized" @click="minimize")
        #main-window
            #chat-window-partners
                .chat-partner-box(v-for="partner in partners" @click="selectPartner(partner)" :class="partner === activePartner && 'selected'")
                    .chat-partner-box-close-icon(@click.stop="deletePartner(partner)") ×
                    .chat-partner-box-online-icon
                        i.user.icon.small(v-show="!partner.isTyping" :class="['online-status-' + partner.ONLINE_STATUS]")
                        i.comment.alternate.small.icon.green(style="color: rgb(190, 188, 190);" v-show="partner.isTyping")
                    .chat-partner-box-name(:class="{'has-new-messages' : partner.hasNewMessages && partner != activePartner }") {{ partner.fullName() }}
            #main-chat
                .empty-chat-pane(v-if="!activePartner.PK") {{ partners.length ? "Select a chat partner at the left" : "Chat messages will show here"  }}
                MessagesPane(small ref="ChatMessagesPane" v-if="activePartner.PK" :partner="activePartner")
                Editor(small ref="ChatEditor" v-show="activePartner.PK" :partner="activePartner" @sentMessage="onSentMessage")
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
            isMaximized: false,
            activePartner: {},
            typedText: "",
            newMessagesCount: 0
        }
    },

    computed: {
        ownID() {
            if (!store.myself) return 0
            return store.myself.PK
        },

        partners() {
            return store.chat.partners
        },

        minimizedTitle() {
            if (!this.newMessagesCount) return "Chat"
            return `Chat - ${this.newMessagesCount} new message${utils.pluralS(this.newMessagesCount)}`
        },

        chatSoundsAreDisabled() {
            return store.disableChatSounds
        }
    },

    methods: {
        minimize() {
            this.isMaximized = false
            this.newMessagesCount = 0
            store.eventBus.$emit("makeNotificationAreaShort", false)
        },

        maximize() {
            this.isMaximized = true
            store.eventBus.$emit("makeNotificationAreaShort", true)
            this.shouldBlink = false
            $("#chat-minimized-wrapper").removeClass("blinking")
            this.$nextTick(() => {
                if (this.$refs.ChatMessagesPane) this.$refs.ChatMessagesPane.scrollToBottom(true)
            })
        },

        toggleSounds() {
            this.$set(store, "disableChatSounds", !store.disableChatSounds)
        },

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
            this.$refs.ChatMessagesPane.scrollToBottom(true)
        }
    },

    created() {
        this.store = store
        this.utils = utils
        store.eventBus.$on("activateChat", partner => {
            this.selectPartner(partner)
            if (!this.isVisible) return
            this.$refs.ChatEditor.focus()
            this.maximize()
        })
        store.eventBus.$on("receivedChatMessage", partner => {
            this.newMessagesCount++

            if (!this.isVisible) return
            if (document.visibilityState != "visible" && !document.title.includes("• ")) document.title = "• " + document.title
            if (document.visibilityState != "visible" || partner != this.activePartner) store.playChatSound(this.chatSound)
            else if (!this.isMaximized) store.playChatSound(this.chatSoundAlternate)
            if (!this.isMaximized) this.shouldBlink = true
        })

        // Blink the window when it's minimized and there's a new message
        setInterval(() => {
            if (!this.shouldBlink) return
            if ($("#chat-minimized-wrapper").hasClass("blinking")) $("#chat-minimized-wrapper").removeClass("blinking")
            else $("#chat-minimized-wrapper").addClass("blinking")
        }, 700)

        this.chatSound = new Audio("/static/sounds/SoundChat.mp3")
        this.chatSoundAlternate = new Audio("/static/sounds/SoundChatAlternate.mp3")
    },

    watch: {
        partners() {
            if (this.partners.length && !this.activePartner.PK) this.selectPartner(this.partners.slice(-1)[0])
        },

        isVisible(newValue) {
            if (newValue) store.eventBus.$emit("makeNotificationAreaShort", this.isMaximized)
        }
    }
}
</script>

<style scoped>
#chat-window-wrapper {
    width: 600px;
    height: 400px;
    position: fixed;
    right: 0px;
    bottom: 0px;
    border: 1px solid grey;
    display: flex;
    flex-direction: column;
}

#chat-minimized-wrapper {
    width: 250px;
    height: 39px;
    position: fixed;
    right: 0px;
    bottom: 0px;
    border-left: 1px solid rgb(41, 47, 66);
    border-top: 1px solid rgb(41, 47, 66);
    background-color: rgb(133, 190, 207);
    display: flex;
}

#chat-minimized-wrapper.blinking {
    background-color: rgb(218, 178, 71);
}

#chat-window-header {
    display: flex;
    background-color: rgb(133, 190, 207);
}

#chat-minimized-title {
    font-weight: 700;
    padding: 10px;
    flex: 1 1 auto;
    cursor: pointer;
}

#chat-window-title {
    font-weight: 700;
    padding: 10px;
    flex: 1 1 auto;
}

.chat-header-icons {
    padding: 10px;
    display: flex;
}

#main-window {
    display: flex;
    flex: 1 1 auto;
    height: 100%;
}

#chat-window-partners {
    width: 170px;
    height: 100%;
    background-color: rgb(255, 250, 250);
    border-right: 1px solid rgb(166, 187, 201);
    flex-shrink: 0;
    overflow-y: auto;
}

#chat-window-partners::-webkit-scrollbar {
    width: 3px;
}

.chat-partner-box {
    padding: 6px;
    background-color: rgb(252, 252, 252);
    display: flex;
    cursor: pointer;
    border-bottom: thin solid #eee;
    border-top: thin solid #eee;
}

.chat-partner-box.selected {
    background-color: rgb(239, 233, 241);
    border-bottom: thin solid rgb(193, 171, 209);
    border-top: thin solid rgb(193, 171, 209);
}

.chat-partner-box-online-icon {
    padding-right: 2px;
}

.chat-partner-box-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 11px;
}

.chat-partner-box-name.has-new-messages {
    font-weight: 700;
}

.chat-partner-box-online-icon .online-status-0 {
    color: rgb(207, 205, 199);
}

.chat-partner-box-online-icon .online-status-1 {
    color: rgb(252, 198, 52);
}

.chat-partner-box-online-icon .online-status-2 {
    color: rgb(162, 221, 223);
}

.chat-partner-box-online-icon .online-status-3 {
    color: rgb(155, 125, 202);
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
    background-color: white;
}

.empty-chat-pane {
    flex: 1 1 auto;
    text-align: center;
    padding-top: 100px;
    color: rgb(140, 155, 155);
    background-color: white;
}
</style>
