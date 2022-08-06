<template lang="pug">
#invoices-wrapper(style="max-width: 800px !important; margin-left: 0 !important")
    .ui.header(v-if="store.didLoadInvoices") Invoices
    .ui.text.active.loader(v-if="!store.didLoadInvoices") Loading invoices...
    #invoices-list-wrapper(v-else-if="invoices.length")
        p These are the most recent invoices issued to you. Click the button at the right to download an invoice.
        table.ui.celled.table(style="font-size: 15px")
            thead
                tr
                    th Invoice number
                    th Date
                    th Amount
                    th Project
                    th Status
                    th Download
                    th
            tbody
                tr(v-for="invoice in invoices")
                    td {{ invoice.NUMBER }}
                    td {{ invoiceDate(invoice) }}
                    td(style="text-align: right") {{ invoice.AMOUNT.toFixed(2) }}
                    td {{ invoice.PROJECTS }}
                    td(:class="{'invoice-not-paid': invoice.STATUS != 1}") {{ invoice.STATUS === 1 ? "Paid" : "Not paid" }}
                    td(style="text-align: center")
                        i.download.icon.clickable(:style="{color: invoice.isDownloading ? '#DDDDDD' : '#444444' }" @click="downloadInvoice(invoice)")        
                    td(v-if="invoice.isLoadingProject && !invoice.project" style="text-align: center") Loading details...
                    td.clickable(v-else style="text-align: center" @click="showProjectDetails(invoice)") Show project details
    p(v-else) We have not issued any invoices to you yet.
</template>

<script>
export default {
    props: {
        store: Object
    },

    computed: {
        invoices() {
            return Object.values(this.store.invoices).reverse()
        }
    },

    methods: {
        invoiceDate(invoice) {
            const date = new Date(invoice.DATE * 1000)
            return date.toLocaleDateString("en-US")
        },

        showProjectDetails(invoice) {
            const projectID = invoice.PROJECT_ID.split(",")[0]
            if (!projectID) return

            if (invoice.project) return this.$emit("showProjectDetails", invoice.project)

            this.$set(invoice, "isLoadingProject", true)
            axios(this.store.apiURL + "Projects?c=" + this.store.code + "&p=" + projectID).then(response => {
                if (response.data) {
                    const project = response.data[0]
                    if (!project) return
                    invoice.project = project
                    this.$emit("showProjectDetails", project)
                }
            })
        },

        downloadInvoice(invoice) {
            if (!invoice || !invoice.PK) return
            if (invoice.isDownloading) return
            this.$set(invoice, "isDownloading", true)
            this.store
                .axios({
                    url: this.store.apiURL + "DownloadInvoice?c=" + this.store.code + "&i=" + invoice.PK,
                    method: "GET",
                    responseType: "blob"
                })
                .then(response => {
                    if (response.status != 200) return
                    const url = window.URL.createObjectURL(new Blob([response.data]))
                    const link = document.createElement("a")
                    link.href = url
                    link.setAttribute("download", `Invoice ${invoice.NUMBER}.pdf`)
                    document.body.appendChild(link)
                    link.click()
                })
                .catch(() => {})
        }
    }
}
</script>

<style scoped>
.invoice-not-paid {
    color: red;
}
</style>
