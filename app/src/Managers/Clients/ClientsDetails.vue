<template lang="pug">
#client-details-wrapper.ui.raised.segment.padded(style="max-width: 850px")
    #client-details-header(@click="editClientName") {{ client.CLIENT_NAME }}
    #client-details-content
        .ui.grid
            div(v-show="!client.PK || !client.isLoaded" style="position: absolute; opacity: 0.55; left: 0; top: 55px; background-color: white; width: 100%; height: calc(100% - 60px); z-index: 1000")
            .ui.tw-size.form.eight.wide.column(style="padding-right: 20px")
                .field
                    TWTextArea(:rows="2" :obj="client" field="ADDRESS" placeholder="Address" :change="updateClient")
                .field
                    TWDropdown(defaultText="Country" search :obj="client" field="COUNTRY_ID" :change="updateClient" :items="store.countries" itemKey="COUNTRY")
                .field
                    TWInput(:obj="client" field="VAT_NUMBER" placeholder="VAT Number" :change="updateClient") 
                .two.fields
                    .field
                        TWDropdown(defaultText="Source" :obj="client" field="SOURCE" :items="C_.clientSources" :change="updateClient" itemKey="SOURCE")
                    .field(style="padding-top: 8px")
                        TWCheckbox(label="Is agency" :obj="client" :change="updateClient" field="IS_AGENCY")
                .field
                    TWInput(:obj="client" field="CONTACT" placeholder="Contact person" :change="updateClient") 
                .field
                    TWTextArea(:rows="2" :obj="client" field="PHONE_NUMBERS" placeholder="Phone numbers" :change="updateClient")
                .field
                    .ui.action.input
                        TWInput(:obj="client" field="WEBSITE" placeholder="Website" :change="updateClient") 
                        .ui.icon.button(@click="utils.openURL(client.WEBSITE, true)")
                            i.play.icon
                .field
                    TWTextArea(:rows="3" :obj="client" field="COMMENTS" placeholder="Comments" :change="updateClient")
                h5.ui.dividing.header Portal
                .field
                    .ui.action.input
                        TWInput(:obj="client" field="PORTAL_URL" placeholder="Portal URL" :change="updateClient") 
                        .ui.icon.button(@click="utils.openURL(client.PORTAL_URL, true)")
                            i.play.icon
                .fields
                    .field
                        TWInput(:obj="client" field="PORTAL_USERNAME" placeholder="Username" :change="updateClient") 
                    .field
                        TWInput(:obj="client" field="PORTAL_PASSWORD" placeholder="Password" :change="updateClient") 
                .field
                    #clients-files-wrapper
                        #clients-files-header
                            #clients-files-header-text Reference files
                            #clients-files-header-add-button(@click.stop="uploadClientFile")
                                i.add.icon.inverted
                        #clients-files-list    
                            .clients-file-item(v-for="file in clientsFiles" :key="file.PK")
                                div(@click="downloadClientFile(file)") {{ file.FILE_NAME }}
                        input#upload-client-file-input(type="file" style="display: none" @change="processBrowseFile")
            .ui.tw-size.form.eight.wide.column(style="padding-right: 25px")
                .two.fields
                    .field(style="display: flex")
                        TWInput(:obj="client" field="AFFILIATE_ID" placeholder="Affiliate code" :change="updateClient") 
                        TWInput(style="width: 50px; margin-left: 10px" :obj="client" field="NAME_TAG" placeholder="Tag" :change="updateClient") 
                    .field
                        TWDropdown(ref="DropdownDivision" defaultText="Division" :obj="client" field="DIVISION_ID" :change="updateClientDivision" :items="store.divisions" itemKey="DIVISION")
                .two.fields
                    .field
                        label Username
                        TWInput(:obj="client" field="USERNAME" placeholder="Username" :change="updateClient") 
                    .field
                        label Password
                        TWInput(:obj="client" field="PASSWORD" placeholder="Password" :change="updateClient") 
                .field
                    TWTextArea(:rows="3" :obj="client" field="EMAILS" placeholder="Email addresses" :change="updateClient")
                .field
                    .ui.action.input
                        TWInput(:obj="client" field="EMAIL_FOR_INVOICES" placeholder="Email for invoices" :change="updateClient")
                        .ui.icon.button(@click="sendEmailExternal(client.EMAIL_FOR_INVOICES)")
                            i.at.icon
                .field
                    .ui.action.input
                        TWInput(:obj="client" field="ACCOUNTING_EMAIL" placeholder="Accounting email" :change="updateClient")
                        .ui.icon.button(@click="sendEmailExternal(client.ACCOUNTING_EMAIL)")
                            i.at.icon
                .three.fields
                    .field
                        TWDropdown(defaultText="Currency" :obj="client" field="CURRENCY" :change="updateClient" :items="constants.currencies" itemKey="CURRENCY")
                    .field
                        TWDropdown(defaultText="Pay terms" :obj="client" field="PAYMENT_TERMS" :change="updateClient" :items="paymentTerms" itemKey="TEXT")
                    .field
                        TWDropdown(defaultText="Payer type" :obj="client" field="PAYER_TYPE" :change="updateClient" :items="payerType" itemKey="TEXT")
                .three.fields
                    .field
                        .ui.right.labeled.input.fluid
                            TWInput(float :obj="client" field="PRICE" placeholder="0" :change="updateClient" style="width: 60px !important")
                            .ui.basic.label / word
                    .field(style="padding-top: 8px; padding-left: 40px")
                        TWCheckbox(label="Prepaid" :obj="client" :change="updateClient" field="REQUIRES_PREPAYMENT")
                    .field(style="padding-top: 8px")
                        TWCheckbox(label="Pays by check" :obj="client" :change="updateClient" field="PAYS_BY_CHECK")
                .two.fields
                    .field
                        TWCheckbox(label="Invoiced monthly" :obj="client" :change="updateClient" field="IS_INVOICED_MONTHLY")
                    .field
                        TWCheckbox(label="Invoiced online" :obj="client" :change="updateClient" field="IS_INVOICED_ONLINE")
                .field
                    TWCheckbox(label="Don't allow projects for this client" :obj="client" :change="updateClient" field="IS_LOCKED_FOR_PROJECTS")
                .field
                    TWCheckbox(ref="checkboxNoPrepaidQuotes" label="Don't allow prepaid quotes for this client" :obj="client" :change="updateNoPrepaidQuotes" field="NO_PREPAID_QUOTES")
                .field
                    TWCheckbox(label="Hold reminders" :obj="client" :change="updateClient" field="HOLD_REMINDERS")
                .field
                    TWTextArea(readonly :rows="3" :value="invoiceReminders" placeholder="Invoice reminders")
                .field
                    label Instructions for project managers
                    TWTextArea(:rows="3" :obj="client" field="SPECIAL_INSTRUCTIONS" :change="updateClient")
                .field
                    label Instructions for translators
                    TWTextArea(:rows="2" :obj="client" field="INSTRUCTIONS_FOR_TRANSLATORS" :change="updateClient")
               
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import TWObject from "../Store/TWObject"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    props: {
        client: Object
    },

    computed: {
        paymentTerms() {
            return [{ PK: 15, TEXT: "15 days" }, { PK: 30, TEXT: "30 days" }, { PK: 45, TEXT: "45 days" }, { PK: 60, TEXT: "60 days" }]
        },

        payerType() {
            return [{ PK: 1, TEXT: "Good" }, { PK: 2, TEXT: "Slow" }, { PK: 3, TEXT: "Bad" }]
        },

        clientsFiles() {
            return store.clientsFiles.filter(clientFile => clientFile.CLIENT_ID === this.client.PK).sort((a, b) => b.PK - a.PK)
        },

        invoiceReminders() {
            let result = ""
            store.invoiceReminders
                .filter(r => r.CLIENT_ID === this.client.PK)
                .forEach(r => {
                    // Create a dummy invoice object based on the data received with the reminder, so we can compute the invoice number
                    const invoiceForNumber = Object.setPrototypeOf(
                        {
                            table: "INVOICES",
                            PK: r.INVOICE_ID,
                            IS_MONTHLY: r.IS_MONTHLY,
                            INVOICE_NUMBER: r.INVOICE_NUMBER,
                            IS_USA_SPECIAL: r.IS_USA_SPECIAL
                        },
                        TWObject.prototype
                    )

                    result += `${utils.formatDate(r.DATE, "D MMM YYYY")} for ${invoiceForNumber.invoiceNumber()}\n`
                })
            return result
        }
    },

    methods: {
        updateClient(field, value) {
            cmg.updateObject(this.client, field, value)
        },

        updateClientDivision() {
            this.$showMessage("You are not allowed to change a client's division. Please contact Support for it.")
            this.$refs.DropdownDivision.revertToPreviousValue()
        },

        updateNoPrepaidQuotes(field, value) {
            if (!store.myself.PERMISSIONS.includes("CLIENTS.NO_PREPAID_QUOTES")) {
                this.$showMessage("You are not allowed to change this value.")
                this.$refs.checkboxNoPrepaidQuotes.setChecked(this.client.NO_PREPAID_QUOTES == true)
                return
            }
            cmg.updateObject(this.client, field, value)
            if (value && this.client.REQUIRES_PREPAYMENT) cmg.updateObject(this.client, "REQUIRES_PREPAYMENT", false)
        },

        async editClientName() {
            const response = await this.$showDialog({
                message: `Update the client's name:`,
                inputText: this.client.CLIENT_NAME
            })

            if (response.selection === "OK" && response.text.trim()) this.updateClient("CLIENT_NAME", response.text)
        },

        downloadClientFile(clientFile) {
            this.$downloadFile(clientFile, "Requested files")
        },

        uploadClientFile() {
            $("#upload-client-file-input").click()
        },

        processBrowseFile(event) {
            const files = [...event.srcElement.files]
            const file = files[0]

            const fileInfo = {
                table: "CLIENTS_FILES",
                CLIENT_ID: this.client.PK,
                FILE_TYPE: C_.cfReference,
                FILE_NAME: file.name
            }

            this.$uploadFile(file, fileInfo, store.uploadTokens.CLIENTS_FILES)

            // Clear the input, so it's ready for the next upload
            $("#upload-client-file-input").val("")
        },

        sendEmailExternal(email) {
            if (email) utils.openURL(`mailto:${email}`)
        }
    }
}
</script>

<style scoped>
#client-details-wrapper {
    display: flex;
    flex-direction: column;
    padding: 0;
    border-radius: 6px;
    height: 100%;
}

#client-details-header {
    padding: 18px 22px;
    background-color: #7ac859;
    border-radius: 5px 5px 0 0;
    font-size: 20px;
    font-weight: 300;
    color: white;
}

#client-details-content {
    padding: 20px;
    flex: 1 1 auto;
    overflow-y: auto;
    height: 0;
}

#clients-files-wrapper {
    width: 100%;
    height: 162px;
    border: 1px solid #ddd;
    border-radius: 5px;
    display: grid;
    grid-template-rows: auto 1fr;
    margin-top: 20px;
}

#clients-files-header {
    border-bottom: 1px solid #ddd;
    background-color: #f0f0f0;
    border-radius: 5px 5px 0 0;
    display: grid;
    grid-template-columns: 1fr auto;
}

#clients-files-header-text {
    display: inline-block;
    margin: 7px 10px;
    padding-top: 3px;
    font-weight: bold;
}

#clients-files-header-add-button {
    display: inline-block;
    padding: 10px 10px 10px 13px;
    border-radius: 0 4px 0 0;
    font-weight: bold;
    background-color: #2185d0;
    cursor: pointer;
}

#clients-files-list {
    background-color: white;
    overflow-y: auto;
    border-radius: 0 0 5px 5px;
}

.clients-file-item {
    border-bottom: 1px solid #ddd;
    padding: 7px 10px;
    cursor: pointer;
}
</style>
