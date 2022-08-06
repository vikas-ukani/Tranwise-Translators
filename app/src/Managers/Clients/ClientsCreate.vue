<template lang="pug">
.modal-create-client.ui.modal(:class="{ 'for-twilio' : $attrs.forTwilio }")
    .header Create client
    i.close.icon
    .content
        .ui.grid
            .ui.form.eight.wide.column(style="padding-right: 20px")
                .field
                    TWInput(mandatory :obj="client" field="CLIENT_NAME" placeholder="Client name" :change="updateClient") 
                .field
                    TWTextArea(:rows="3" :obj="client" field="ADDRESS" placeholder="Address" :change="updateClient")
                .field
                    TWDropdown(mandatory search defaultText="Country" :obj="client" field="COUNTRY_ID" :change="updateClient" :items="store.countries" itemKey="COUNTRY")
                .field
                    TWTextArea(:rows="5" :obj="client" field="COMMENTS" placeholder="Comments" :change="updateClient")
            .ui.form.eight.wide.column(style="padding-right: 25px")
                .two.fields
                    .field
                        TWInput(:obj="client" field="NAME_TAG" placeholder="Tag" :change="updateClient") 
                    .field
                        TWDropdown(mandatory showall defaultText="Division" :obj="client" field="DIVISION_ID" :change="updateClient" :items="store.divisions" itemKey="DIVISION")
                .field
                    TWTextArea(mandatory :rows="5" :obj="client" field="EMAILS" placeholder="Email addresses" :change="updateClient")
                .field
                    TWDropdown(mandatory showall defaultText="Source" :obj="client" field="SOURCE" :items="constants.clientSources" :change="updateClient" itemKey="SOURCE")
                .three.fields
                    .field
                        .ui.right.labeled.input.fluid
                            TWInput(mandatory float :obj="client" field="PRICE" placeholder="0" :change="updateClient")
                            .ui.basic.label / word
                    .field
                        TWDropdown(mandatory defaultText="Currency" :obj="client" field="CURRENCY" :items="constants.currencies" :change="updateClient" itemKey="CURRENCY")
                    .field(style="padding-top: 8px")
                        TWCheckbox(label="Prepaid" :obj="client" :change="updateClient" field="REQUIRES_PREPAYMENT")
                .two.fields
                    .field
                        TWInput(:obj="client" field="AFFILIATE_ID" placeholder="Affiliate code" :change="updateClient")
                    .field(style="padding-top: 8px")
                        TWCheckbox(label="Is agency" :obj="client" :change="updateClient" field="IS_AGENCY")
    .actions(style="display: flex")
        div(style="flex-grow: 1; text-align: left; color: red; padding: 10px")
            div(:class="{hidden: !hasMandatoryProblems}") Please fill in all the mandatory fields.
        .ui.cancel.button Cancel
        .ui.button.green(@click="doCreateClient") Create client
        //- This hidden button is used to close the modal. The one above should not close it, as there might be errors in the form.
        .ui.button.positive.dummy-create-client-button(style="display: none")
</template>

<script>
import { store, cmg, constants } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    props: {
        client: Object
    },

    data() {
        return {
            hasMandatoryProblems: false
        }
    },

    methods: {
        show() {
            // Reset the mandatory fields' class, so they are not highlighted
            for (let child of this.$children) if (child.highlightMandatory) child.highlightMandatory(false)

            this.showModal(".modal-create-client")
        },

        showForTwilio() {
            // Reset the mandatory fields' class, so they are not highlighted
            for (let child of this.$children) if (child.highlightMandatory) child.highlightMandatory(false)

            this.showModal(".modal-create-client.for-twilio")
        },

        updateClient(field, value) {
            this.$props.client[field] = value
        },

        doCreateClient() {
            // Check if any of the mandatory fields are blank
            this.hasMandatoryProblems = false
            for (let child of this.$children) {
                if (child.highlightMandatory && child.highlightMandatory()) this.hasMandatoryProblems = true
            }
            if (this.hasMandatoryProblems) return

            if (!this.$props.client.CLIENT_NAME) return

            this.$emit("createClient")

            // This triggers the closing of the form
            $(".dummy-create-client-button").click()
        }
    }
}
</script>

<style scoped>
</style>
