<template lang="pug">
.div-zero
    .ui.small.modal(:id="modalID")
        .header Send a message about project {{ project.PROJECT_NUMBER }}
        i.close.icon
        .content
            .ui.form
                .field
                    TWDropdown.show-more-items(
                        ref="dropdownRecipient",
                        defaultText="Select a recipient",
                        :showItemsCount="11",
                        :obj="newMessage",
                        field="RECIPIENT",
                        :items="recipients()",
                        :change="setRecipient",
                        itemKey="NAME"
                    )
                .field
                    TWDropdown.show-more-items(
                        ref="dropdownManagementGroupSubFiled",
                        defaultText="Select a Via",
                        :showItemsCount="11",
                        :obj="newMessage",
                        field="VIA",
                        :items="MTSubFiled()",
                        :change="MTRecipient",
                        itemKey="NAME",
                        v-if="newMessage.RECIPIENT == 'MT'"
                    )
                .field
                    TWInput(:obj="newMessage", placeholder="Upwork-id", field="UPWID", :change="updateMeaasge", v-if="newMessage.RECIPIENT == 'MT' && newMessage.VIA == 'UPW'") 
                .field
                    TWInput(
                        :obj="newMessage",
                        placeholder="Upwork-price",
                        field="UPWPRICE",
                        :change="updateMeaasge",
                        v-if="newMessage.RECIPIENT == 'MT' && newMessage.VIA == 'UPW'"
                    )
                .field
                    textarea(rows="6", v-model="newMessage.MESSAGE", placeholder="Message")
        .actions
            .ui.teal.button(v-if="shouldShowTemplateButton", style="margin-right: 100px", @click="addTemplateMessage") +
            .ui.cancel.button Cancel
            .ui.positive.button.transition(@click="doSendProjectMessage", :class="{ disabled: !shouldEnableSendButton }") Send message
</template>

<script>
import { store, utils, cmg, constants as C_ } from "../../CoreModules"

export default {
    props: {
        project: Object,
        subproject: Object,
        // The sender can be AM, DM or undefined, depending on who is using the component.
        // If undefined, it will be myself.PK
        sender: String
    },

    data() {
        return {
            modalID: "",
            newMessage: { MESSAGE: "", RECIPIENT: "", VIA: "", UPWID: "", UPWPRICE: "" }
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
        },

        shouldShowTemplateButton() {
            return store.myself.PK === 238
        }
    },

    methods: {
        show() {
            this.resetForm()
            utils.showModal("#" + this.modalID, { autofocus: false })
        },

        addTemplateMessage() {
            this.newMessage.MESSAGE = store.Settings("MESSAGE_TEMPLATE_1")
        },

        setRecipient(_field, value) {
            this.newMessage.RECIPIENT = value
        },
        updateMeaasge(field, value) {
            if (field == "UPWID") this.newMessage.UPWID = value
            if (field == "UPWPRICE") this.newMessage.UPWPRICE = value
        },
        MTRecipient(_field, value) {
            this.newMessage.VIA = value
        },

        doSendProjectMessage() {
            function sendMessage(recipient) {
                store.sendProjectMessage(this.project, this.subproject, this.sender || store.myself.PK, recipient, this.newMessage.MESSAGE, this.newMessage.RECIPIENT !== "CL")
            }

            // If "All translators and proofreaders" was selected
            if (this.newMessage.RECIPIENT === "TP") {
                const assignedTranslations = this.project.assignedTranslations()
                for (let translation of assignedTranslations) sendMessage.call(this, translation.EMPLOYEE_ID)
            } else {
                sendMessage.call(this, this.newMessage.RECIPIENT)
            }
            if (this.newMessage.RECIPIENT === "MT") {
                if (this.newMessage.VIA === "UPW" && this.newMessage.UPWID && this.newMessage.UPWPRICE) {
                    store.updateProjectInUpwork(this.project, this.newMessage.UPWID, this.newMessage.UPWPRICE);
                }
            }
        },

        resetForm() {
            this.$nextTick(() => {
                this.newMessage.RECIPIENT = ""
                this.newMessage.MESSAGE = ""
                this.newMessage.VIA = ""
                this.newMessage.UPWID = ""
                this.newMessage.UPWPRICE = ""
                this.$refs.dropdownRecipient.clear()
            })
        },

        recipients() {
            if (!this.project.isDataLoaded) return []

            const recs = []

            recs.push({ PK: "MT", NAME: "Management team" })
            recs.push({ PK: "GM", NAME: "General manager" })
            recs.push({ PK: "CM", NAME: "Care manager" })
            recs.push({ PK: "AM", NAME: "Assignment manager" })
            recs.push({ PK: "DM", NAME: "All deadline managers" })

            // Add all the deadline managers
            for (let employee of store.employees) {
                if (employee.EMPLOYEE_TYPE === C_.etManager && employee.MANAGER_TYPE === C_.emtDeadline)
                    recs.push({ PK: employee.PK, NAME: "Deadline manager - " + employee.fullName() })
            }

            // If myself is a deadline manager, the message has to be approved first
            if (store.myself.MANAGER_TYPE === C_.emtDeadline) recs.push({ PK: "T2C", NAME: "Client (needs approval)" })
            else recs.push({ PK: "CL", NAME: "Client" })

            // Add all the translators and proofreaders assigned to this project
            const assignedTranslations = this.project.assignedTranslations()
            for (let translation of assignedTranslations) {
                const employee = translation.employee()
                const subproject = translation.subproject()
                let name = employee.fullName()
                if (translation.STATUS === C_.tsTranslating) name += " [ Translator - "
                if (translation.STATUS === C_.tsProofreading) name += " [ Proofreader - "
                name += subproject.languageName() + " ]"
                recs.push({ PK: employee.PK, NAME: name })
            }

            recs.push({ PK: "TP", NAME: "All translators and proofeaders" })

            return recs
        },
        MTSubFiled() {
            if (!this.project.isDataLoaded) return []
            return [
                { PK: "All", NAME: "None" },
                { PK: "UPW", NAME: "upwork" }
            ]
        }
    }
}
</script>

<style scoped></style>
