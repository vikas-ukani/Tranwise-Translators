<template lang="pug">
#projects-shipping-page-wrapper
    .ui.grid.tw-size.form
        .ui.eight.wide.column
            .field Client: {{ project.client() ? project.client().CLIENT_NAME : "" }}
            .field Email: {{ project.PROJECT_EMAIL }}
            ProjectShippingDetails(:project="project")
            .fields(style="padding-top: 20px")
                .field
                    .ui.button.teal.tiny(@click="copyShippingDetails") Copy details
                .field
                    .ui.button.coolblue.tiny(@click="checkAddressDetails") Check address details
            .field(style="color: red; white-space: pre; padding-top: 30px") {{ hasShippingServiceWarning }}
        .ui.eight.wide.column(style="padding-right: 0")
            .field.disabled
                TWDropdown(showall defaultText="Shipping method" :obj="project" field="SHIPPING_METHOD" :items="C_.shippingMethods" :change="updateShippingMethod" itemKey="METHOD")
            .fields.inline
                .ui.right.labeled.input
                    TWInput(float :obj="project" field="SHIPPING_COST" placeholder="Shipping cost" :change="updateProject" style="width: 65px; text-align: right")
                    .ui.basic.label(style="width: 30px") {{ C_.currencySymbols[project.CURRENCY] || "$" }}
                .field(style="margin-left: 20px")
                    TWCheckbox(label="Shipping paid" :obj="project" :change="updateProject" field="SHIPPING_IS_PAID")
                .field
                    .ui.coolblue.button.tiny(@click="calculateShippingCost") Calculate cost
            .field
                .ui.right.labeled.input
                    TWInput(integer :obj="project" field="PRINT_COPIES_COUNT" :change="updateProject" style="max-width: 65px; text-align: right")
                    .ui.basic.label print copies
            .field
                TWTextArea(:rows="3" :obj="project" :value="shippingPaymentDetails" :change="updateShippingPaymentDetails")
            .field(style="text-align: right")
                div {{ requestedShippingInformation }}
                    .ui.coolgreen.button.tiny(@click="requestShippingDetails" style="margin-left: 20px") Request shipping details
            .fields.inline(style="padding-top: 15px")
                .field(style="width: 180px")
                    TWInput(:obj="project" field="SHIPPING_TRACKING_NUMBER" placeholder="Tracking number" :change="updateProject")
                .field
                    .ui.teal.button.tiny(style="padding-left: 10px; padding-right: 10px" @click="checkTrackingStatus") Check status
                .field(v-if="project.SHIPPING_TRACKING_NUMBER")
                    .ui.coolblue.button.tiny(style="padding-left: 10px; padding-right: 10px" @click="sendTrackingMessage") Send email
            .field(v-if="project.CLIENT_REQUESTED_EXTRA_COPIES")
                TWInput(:obj="project" field="ADDITIONAL_TRACKING_NUMBER" placeholder="Extra tracking number" :change="updateProject")
            .field
                TWTextArea(:rows="3" :obj="project" field="PAYMENT_DETAILS" placeholder="Payment details" :change="updateProject")
    .ui.grid.tw-size.form(style="padding-left: 12px")
        TWTextArea(:rows="4" :obj="project" field="WORK_DETAILS" placeholder="Work details" :change="updateProject")
</template>

<script>
import { store, cmg, utils, constants as C_ } from "../CoreModules"
import ProjectShippingDetails from "./Components/ProjectShippingDetails"

export default {
    props: {
        project: Object
    },

    components: {
        ProjectShippingDetails
    },

    created() {
        this.C_ = C_
    },

    computed: {
        shippingPaymentDetails() {
            if (utils.isNotBlank(this.project.SHIPPING_PAYMENT_DETAILS)) return this.project.SHIPPING_PAYMENT_DETAILS
            return "Date paid: \nAmountPaid: \nTransactionID: "
        },

        hasShippingServiceWarning() {
            for (let projectService of store.projectsServices)
                if (projectService.PROJECT_ID === this.project.PK && projectService.SERVICE_TYPE === C_.psShipping && !projectService.IS_COMPLETED)
                    return "Project has shipping service.\nPlease check the services page."
        },

        requestedShippingInformation() {
            if (this.project.REQUESTED_SHIPPING_INFORMATION_DATE) return `Requested on ${utils.formatDate(this.project.REQUESTED_SHIPPING_INFORMATION_DATE, "D MMM,  hh:mm")}`
        }
    },

    methods: {
        updateProject(field, value) {
            cmg.updateObject(this.project, field, value)
        },

        updateShippingMethod(field, value) {
            this.$showMessage("We don't do shipping anymore. The shipping method wasn't updated.")
            return

            this.updateProject(field, value)
            if (value === 1) this.updateProject("SHIPPING_COST", 12)
            if (value === 2) this.updateProject("SHIPPING_COST", 29)
        },

        updateShippingPaymentDetails(_, value) {
            cmg.updateObject(this.project, "SHIPPING_PAYMENT_DETAILS", value)
        },

        calculateShippingCost() {
            utils.openURL("https://www.universal-translation-services.com/fedex-calc/")
        },

        copyShippingDetails() {
            const proj = this.project
            let text = `Project number: ${proj.PROJECT_NUMBER}\n`
            text += utils.isNotBlank(proj.SHIPPING_NAME) ? proj.SHIPPING_NAME : proj.client().CLIENT_NAME
            text += `\n${proj.SHIPPING_DETAILS}\n${proj.SHIPPING_STREET}\n${proj.SHIPPING_CITY}, ${proj.SHIPPING_STATE} ${proj.SHIPPING_ZIP}`
            if ([1, 2].includes(this.project.SHIPPING_METHOD)) text += `\n${proj.SHIPPING_COUNTRY}`
            if (utils.isNotBlank(proj.SHIPPING_PHONE)) text += `\n${proj.SHIPPING_PHONE}`
            utils.copyToClipboard(text)
        },

        checkAddressDetails() {
            utils.openURL("https://www.ups.com/address_validator/search?loc=es_US")
        },

        async requestShippingDetails() {
            const proj = this.project
            const code = proj.PK + utils.md5(proj.PK + "TranwiseWebChecksum")
            const shouldSendByTwilio = proj.TWILIO_STATUS > 0 && proj.PROJECT_EMAIL === store.Settings("EMAIL_FOR_TWILIO_PROJECTS")

            if (shouldSendByTwilio) {
                let m =
                    "Dear client,\n\n" +
                    "In order to have your documents shipped to you, please go to the link below and provide us with the shipping information for your translation.\n\n" +
                    `https://www.universal-translation-services.com/shipping-details/?code=${code}\n\nThank you!`

                let phoneNumber = proj.client().PHONE_NUMBERS
                if (phoneNumber.includes("\n")) phoneNumber = phoneNumber.substring(0, phoneNumber.indexOf("\n"))

                const response = await this.$showDialog({
                    header: `Request the shipping information for ${this.project.PROJECT_NUMBER}`,
                    message: `Type your message to the client (max. 500 characters):`,
                    textAreaText: m,
                    buttons: ["Cancel", "Send Twilio message"],
                    buttonClasses: ["", "positive"]
                })

                if (response.selection != "Send Twilio message" || utils.isBlank(response.text)) return
                const twilioMessage = {
                    table: "TWILIO_MESSAGES",
                    PHONE_NUMBER: phoneNumber,
                    MESSAGE: response.text.substring(0, 500),
                    IS_ANSWERED: true,
                    IS_WHATSAPP: proj.TWILIO_STATUS === 2 ? 1: 0
                }
                cmg.insertObject(twilioMessage)
            } else {
                // prettier-ignore
                if (this.$checkWithMessage(utils.isBlank(this.project.PROJECT_EMAIL), `This project does not have the "project email" set. Please correct this before sending the email.`)) return

                let m =
                    "Dear client,\n\n" +
                    "In order to have your documents shipped to you, please go to the link below and provide us with the shipping information for your translation.\n\n" +
                    `https://www.universal-translation-services.com/shipping-details/?code=${code}\n\n` +
                    "Note: If the link is split into multiple lines, please copy and paste it in your browser, making sure that the code is included.\n\n" +
                    "Also, please note that the price for shipping applies only if the document is being sent in the USA. For overseas shipping, additional charges may apply.\n\nThank you!"

                const response = await this.$showDialog({
                    header: `Request the shipping information for ${this.project.PROJECT_NUMBER}`,
                    message: `Type your message to the client:`,
                    textAreaText: m,
                    buttons: ["Cancel", "Send email"],
                    buttonClasses: ["", "positive"]
                })

                if (response.selection != "Send email" || utils.isBlank(response.text)) return
                cmg.sendEmail(
                    this.project.client().division().EMAIL,
                    this.project.PROJECT_EMAIL,
                    `Shipping information required for translation "${this.project.CLIENT_ORDER_NUMBER}" (no. ${this.project.PROJECT_NUMBER})`,
                    response.text
                )
                this.updateProject("REQUESTED_SHIPPING_INFORMATION_DATE", "SERVER_TIME_TAG")
            }
        },

        checkTrackingStatus() {
            if (this.$checkWithMessage(utils.isBlank(this.project.SHIPPING_TRACKING_NUMBER), "Please fill in the tracking number first.")) return
            let url
            if ([1, 2].includes(this.project.SHIPPING_METHOD)) url = "https://tools.usps.com/go/TrackConfirmAction?tLabels=" + this.project.SHIPPING_TRACKING_NUMBER
            else if ([3, 4, 5, 6, 7, 8].includes(this.project.SHIPPING_METHOD))
                url = `https://www.fedex.com/apps/fedextrack/?action=track&trackingnumber=${this.project.SHIPPING_TRACKING_NUMBER}&cntry_code=us&locale=en_US`
            else {
                this.$showMessage("Please select a shipping method first.")
                return
            }
            utils.openURL(url)
        },

        async sendTrackingMessage() {
            const division = this.project.client().division()

            let m = "Dear client,\n\n"

            if ([1, 2].includes(this.project.SHIPPING_METHOD))
                m += "Please find below the USPS details of your shipment.\n\nLink to track your certified translation: https://tools.usps.com/go/TrackConfirmAction_input"
            else if ([3, 4, 5, 6, 7, 8].includes(this.project.SHIPPING_METHOD))
                m += "Please find below the FedEx details of your shipment.\n\nLink to track your certified translation: https://www.fedex.com/apps/fedextrack/?action=track"
            else {
                this.$showMessage("Tracking is not available for the selected shipping method.")
                return
            }

            m += `\n\nTracking number: ${this.project.SHIPPING_TRACKING_NUMBER}\n\nThank you for your order!\n\nAnita Huisman`

            const response = await this.$showDialog({
                header: `Send email about the shipping of ${this.project.PROJECT_NUMBER}`,
                message: `Type your message to the client:`,
                textAreaText: m,
                buttons: ["Cancel", "Send email"],
                buttonClasses: ["", "positive"]
            })

            if (response.selection === "Send email") {
                cmg.sendEmail(
                    division.EMAIL,
                    this.project.PROJECT_EMAIL,
                    `Shipping of project "${this.project.CLIENT_ORDER_NUMBER}" (no. ${this.project.PROJECT_NUMBER})`,
                    response.text
                )
            }
        }
    }
}
</script>

<style scoped>
#projects-shipping-page-wrapper {
    width: 100%;
    height: 100%;
    padding: 0 20px;
}
</style>
