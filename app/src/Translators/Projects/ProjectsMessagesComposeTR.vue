<template lang="pug">
.div-zero
    .ui.small.modal(:id="modalID")
        .header Send a message about project {{project.PROJECT_NUMBER}}
        i.close.icon
        .content
            .ui.form
                .field
                    TWDropdown.show-more-items(ref="dropdownRecipient" defaultText="Select a recipient" :showItemsCount="5" :obj="newMessage" field="RECIPIENT" :items="recipients()" :change="setRecipient" itemKey="NAME")
                .field
                    textarea(rows="6" v-model="newMessage.MESSAGE" placeholder="Message")
        .actions
            .ui.cancel.button Cancel
            .ui.positive.button.transition(@click="doSendProjectMessage" :class="{disabled: !shouldEnableSendButton }") Send message
    
</template>

<script>
import C_ from "../ConstantsTR"
import utils from "../UtilsTR"
import cmg from "../ConnectionManagerTR"
import store from "../Store/StoreTR"

export default {
    props: {
        project: Object,
        translation: Object,
        subproject: Object
    },

    data() {
        return {
            modalID: "",
            newMessage: { MESSAGE: "", RECIPIENT: "" }
        }
    },

    created() {
        this.modalID = "modal-compose-message-" + utils.getUniqueID()
    },

    destroyed() {
        $("#" + this.modalID).remove()
    },

    computed: {
        shouldEnableSendButton() {
            return this.newMessage.MESSAGE.trim() && this.newMessage.RECIPIENT
        }
    },

    methods: {
        show() {
            this.resetForm()
            utils.showModal("#" + this.modalID, { autofocus: false })
        },

        setRecipient(_field, value) {
            this.newMessage.RECIPIENT = value
        },

        doSendProjectMessage() {
            const projectMessage = {
                table: "PROJECTS_MESSAGES",
                PROJECT_ID: this.project.PK,
                SUBPROJECT_ID: this.subproject.PK,
                TRANSLATION_ID: this.translation.PK,
                SENDER: store.myself.PK,
                RECIPIENT: this.newMessage.RECIPIENT,
                MESSAGE: this.newMessage.MESSAGE,
                IS_PROBLEM: this.newMessage.RECIPIENT != "CCM",
                metadata: {
                    PROJECT_NUMBER: this.project.PROJECT_NUMBER
                }
            }
            cmg.insertObject(projectMessage)
        },

        resetForm() {
            this.$nextTick(() => {
                this.newMessage.RECIPIENT = ""
                this.newMessage.MESSAGE = ""
                this.$refs.dropdownRecipient.clear()
            })
        },

        recipients() {
            const recs = []

            recs.push({ PK: "DM", NAME: "Deadline managers" })
            recs.push({ PK: "AM", NAME: "Assignment manager" })
            recs.push({ PK: "GM", NAME: "General manager" })
            recs.push({ PK: "MT", NAME: "Management team" })

            if ([C_.psCompleted, C_.psCompletedAfterReopen].includes(this.project.STATUS)) recs.push({ PK: "CCM", NAME: "Client complaints manager" })
            else recs.push({ PK: "T2C", NAME: "Client (has to be approved by a project manager first)" })

            return recs
        }
    }
}
</script>

<style scoped>
</style>
