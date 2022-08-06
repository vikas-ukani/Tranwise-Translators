<template lang="pug"> 
.ui.large.form
    h3.ui.dividing.header.violet Pricing
    .field(style="white-space: pre-wrap") <span style="font-weight: 700; padding-right: 6px">Base price:</span> {{ utils.currencySymbols[quote.CURRENCY] }} {{ quote.PRICE.toFixed(2) }} {{ quote.priceBreakdown }}
    h3.ui.dividing.header.violet(v-if="quote.IS_CERTIFIED || quote.IS_NOTARIZED") Extra services requested
    .field(style="padding-left: 10px; margin-top: -5px" v-if="quote.IS_NOTARIZED") Notarized translation — $ 20
    .field(style="padding-left: 10px; margin-top: -5px" v-if="quote.IS_CERTIFIED") Digital certification — $ 10 / document — <a href="https://www.universal-translation-services.com/digital-certified-translation/" target="_blank">Click here</a> for more info
    h3.ui.dividing.header.violet Extra information for translators
    .field(style="font-size: 14px") If you have extra information (like spelling for names etc.) that our translators should know, please use the button below to communication this information to us.
    .fields
        .field
            .ui.tiny.button.purple(@click="sendQuoteMessage") Provide extra information
        .field(style="padding-top: 5px; color: green") {{ messageSentConfirmation }}
    h3.ui.dividing.header.violet Files uploaded for translation
    table.ui.celled.table.files-table
        tbody
            tr(v-for="file in quote.files")
                td {{ file.FILE_NAME }}
                td(v-if="file.isDownloading" style="text-align: right; color: lightgrey") Downloading...
                td.clickable(v-else style="text-align: right" @click="downloadFile(file)") Download file
    .field(v-if="quote.isAccepted" style="color: green") Thank you for accepting this quote! Our project managers will start working on it soon.
    .field(v-else-if="quote.isCancelled" style="color: red") You have cancelled this quote.
    .field(v-else-if="quote.isCancelling" style="text-align: right; padding-right: 30px") Cancelling quote...
    .field(v-else-if="quote.isAccepting" style="text-align: right; padding-right: 30px") Sending your acceptance...
    .field(v-else-if="quote.isWaitingForPayment" style="text-align: right; padding-right: 30px") Waiting for payment...
    .fields(v-else style="padding-top: 20px")
        .ui.tiny.button.violet(style="margin-left: 18px" @click="newQuote") New quote
        .field(style="flex-grow: 1")
        .ui.tiny.button.red(style="margin-right: 20px" @click="cancelQuote") Cancel quote
        .ui.tiny.button.orange(style="margin-right: 20px" @click="askForChanges") Ask for changes
        .ui.tiny.button.green(v-if="quote.PAYMENT_LINK" style="margin-right: 20px" @click="payQuote") {{ payButtonText }}
        .ui.tiny.button.green(v-else style="margin-right: 20px" @click="acceptQuote") Accept quote
    #modal-cancel-quote.ui.small.modal
        .header Cancel quote
        i.close.icon
        .content
            .ui.form
                .field
                    textarea(rows="3" v-model="cancelReason" placeholder="Please let us know the reason you want to cancel this quote")
        .actions
            .ui.cancel.button Go back
            .ui.negative.button(@click="doCancelQuote") Cancel quote
    #modal-send-quote-message.ui.small.modal
        .header Provide additional information
        .content
            .ui.form
                .field
                    textarea(rows="6" v-model="message" placeholder="Please type here any additional information (like spelling for names etc.) that our translators should know")
        .actions
            .ui.cancel.button Cancel
            .ui.positive.button(@click="doSendQuoteMessage") Send message
</template>

<script>
import utils from "../UtilsCL"

export default {
    props: {
        quote: Object,
        store: Object
    },

    data() {
        return {
            cancelReason: "",
            message: "",
            messageSentConfirmation: ""
        }
    },

    created() {
        this.utils = utils
    },

    computed: {
        payButtonText() {
            if (this.quote.REQUIRED_PREPAYMENT_PERCENT > 0 && this.quote.REQUIRED_PREPAYMENT_PERCENT < 100) return `Pay ${this.quote.REQUIRED_PREPAYMENT_PERCENT}% now`
            return "Pay now"
        }
    },

    methods: {
        doCancelQuote() {
            this.$set(this.quote, "isCancelling", true)

            this.store
                .axios({
                    url: this.store.apiURL + "CancelQuote",
                    method: "post",
                    data: {
                        c: this.store.code,
                        q: this.quote.PK,
                        reason: this.cancelReason
                    }
                })
                .then(response => {
                    if (response.status != 200) return
                    if (response.data === "OK") {
                        this.$set(this.quote, "isCancelled", true)
                        this.$set(this.quote, "isCancelling", false)
                    }
                })
                .catch(() => {})
        },

        cancelQuote() {
            $("#modal-cancel-quote").modal("show")
        },

        acceptQuote() {
            this.$set(this.quote, "isAccepting", true)
            this.store
                .axios({
                    url: this.store.apiURL + "AcceptQuote",
                    method: "post",
                    data: {
                        c: this.store.code,
                        q: this.quote.PK
                    }
                })
                .then(response => {
                    if (response.status != 200) return
                    if (response.data === "OK") {
                        this.$set(this.quote, "isAccepted", true)
                        this.$set(this.quote, "isAccepting", false)
                    }
                })
                .catch(() => {})
        },

        sendQuoteMessage() {
            this.message = ""
            this.messageSentConfirmation = ""
            $("#modal-send-quote-message").modal("show")
        },

        doSendQuoteMessage() {
            if (!this.message) return
            this.store
                .axios({
                    url: this.store.apiURL + "SendProjectMessage",
                    method: "post",
                    data: {
                        c: this.store.code,
                        p: this.quote.PK,
                        m: this.message
                    }
                })
                .then(response => {})
                .catch(() => {})
            this.messageSentConfirmation = "Message sent"
        },

        downloadFile(file) {
            if (!file || !file.PK) return
            this.$set(file, "isDownloading", true)
            this.store
                .axios({
                    url: this.store.apiURL + "DownloadProjectFile?c=" + this.store.code + "&f=" + file.PK + "&s=" + file.CODE,
                    method: "GET",
                    responseType: "blob"
                })
                .then(response => {
                    if (response.status != 200) return
                    const url = window.URL.createObjectURL(new Blob([response.data]))
                    const link = document.createElement("a")
                    link.href = url
                    link.setAttribute("download", file.FILE_NAME)
                    document.body.appendChild(link)
                    link.click()
                })
                .catch(() => {})
        },

        payQuote() {
            this.$set(this.quote, "isWaitingForPayment", true)
            window.open(this.quote.PAYMENT_LINK)
        },

        newQuote() {
            window.open("https://www.universal-translation-services.com/submit/", "_blank", "toolbar=yes,scrollbars=yes,resizable=yes,top=120,left=120,width=550,height=600")
        },

        askForChanges() {
            window.open("https://www.universal-translation-services.com/support/", "_blank", "toolbar=yes,scrollbars=yes,resizable=yes,top=120,left=120,width=550,height=600")
        }
    }
}
</script>

<style scoped>
.files-table {
    font-size: 13px;
}

h3.ui.header {
    background-color: #1ea8c1;
    color: white !important;
    margin: 35px -15px 10px -15px;
    padding: 8px 14px;
    font-size: 15px;
    border-bottom: none !important;
}
</style>
