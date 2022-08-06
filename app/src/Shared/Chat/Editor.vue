<template lang="pug">
.chat-editor-wrapper(:class=" { hover: isHovering }" @dragover.stop.prevent="isHovering = true"
    @dragleave.prevent="isHovering = false"
    @drop.prevent="drop")
    .chat-editor-input
        .ui.form
            textarea(ref="ChatTextInput" rows="2" v-model="typedText" @keydown.enter="onKeyEnter")
    .chat-editor-buttons
        div
            div
                i.paper.plane.icon(@click="sendMessage")
            div
                i.file.icon(style="margin: 10px 0" @click="sendFile")
        div(v-if="!$attrs.small" style="padding-left: 10px")
            i.volume.up.icon(:style="{opacity: chatSoundsAreDisabled ? 0.2 : 1}" @click="toggleSounds")
    div(style="display: none")
        input(ref="ChatFileInput" type="file" class="selectChatFileInput" @change="processBrowseFiles")   
</template>

<script>
import store from "../StoreBase"
import utils from "../UtilsBase"
import cmg from "../ConnectionManagerBase.js"

export default {
    props: {
        partner: Object
    },

    data() {
        return {
            typedText: "",
            isHovering: false
        }
    },

    created() {
        this.store = store
    },

    computed: {
        chatSoundsAreDisabled() {
            return store.disableChatSounds
        }
    },

    methods: {
        onKeyEnter(event) {
            if (event.shiftKey) return
            event.preventDefault()
            this.sendMessage()
        },

        focus() {
            setTimeout(() => {
                this.$refs.ChatTextInput.focus()
            }, 10)
        },

        toggleSounds() {
            this.$set(store, "disableChatSounds", !store.disableChatSounds)
        },

        sendMessage() {
            const message = {
                senderID: store.myself.PK,
                recipientID: parseInt(this.partner.PK, 10),
                token: this.partner.chatToken,
                text: this.typedText
            }
            store.addChatMessage(message)
            cmg.sendChat(message)
            this.typedText = ""
            this.$emit("sentMessage")
        },

        setTypedText(text) {
            this.typedText = text
        },

        sendFile() {
            this.$refs.ChatFileInput.click()
        },

        processBrowseFiles(event) {
            const files = [...event.srcElement.files]
            const file = files[0]

            this.processSendFile(file)

            // Clear the input, so it's ready for the next upload
            $(".selectChatFileInput").val("")
        },

        processSendFile(file) {
            const fileInfo = {
                table: "EMPLOYEES_FILES",
                TO_ID: parseInt(this.partner.PK, 10),
                token: this.partner.chatToken,
                FILE_NAME: file.name
            }

            this.$uploadFile(file, fileInfo, store.uploadTokens.EMPLOYEES_FILES)

            // Add a message to the chat as visual feedback
            const message = {
                senderID: store.myself.PK,
                recipientID: parseInt(this.partner.PK, 10),
                text: "Sent file: " + file.name
            }
            store.addChatMessage(message)
        },

        drop(event) {
            this.isHovering = false
            const file = event.dataTransfer.files[0]
            this.processSendFile(file)
        }
    },

    watch: {
        typedText(newValue, oldValue) {
            if (!oldValue && newValue) {
                const message = {
                    senderID: store.myself.PK,
                    recipientID: parseInt(this.partner.PK, 10),
                    token: this.partner.chatToken,
                    startedTyping: true
                }
                if (message.recipientID) cmg.sendChat(message)
            }
            if (oldValue && !newValue) {
                const message = {
                    senderID: store.myself.PK,
                    recipientID: parseInt(this.partner.PK, 10),
                    token: this.partner.chatToken,
                    cancelledTyping: true
                }
                if (message.recipientID) cmg.sendChat(message)
            }
            this.partner.typedText = newValue
        }
    }
}
</script>

<style scoped>
.chat-editor-wrapper {
    display: flex;
    border-top: 1px solid rgb(213, 229, 235);
    padding: 10px 0 8px 10px;
    background-color: #e4f3f7;
}

.chat-editor-input {
    flex: 1 1 auto;
}

.chat-editor-buttons {
    padding: 8px;
    cursor: pointer;
    display: flex;
}

.hover {
    box-shadow: inset 0px 0px 10px -1px rgba(0, 0, 0, 0.7);
}
</style>

