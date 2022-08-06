<template lang="pug">
#projects-services-page-wrapper
    .ui.tw-size.form(style="width: 100%; flex: 1 1 auto; display: flex")
        div(style="width: 400px; margin-right: 20px")
            #projects-services-wrapper
                .services-list-item(v-for="s in services" @click="selectService(s)" :class="{selected: s.PK == service.PK}" @contextmenu.prevent="contextMenu($event, s)")
                    div(style="padding: 11px 0 0 5px" :style="{color: s.IS_PAID ? 'green' : 'red'}")
                        i.large.dollar.icon(:style="{opacity: s.WAS_INITIAL ? 0 : 100}" @click.stop="toggleServicePaid(s)")
                    div(style="padding: 11px 5px 0 0" :style="{color: s.IS_COMPLETED ? 'green' : 'lightgrey'}")
                        i.large.check.icon(@click.stop="toggleServiceCompleted(s)")
                    div
                        .line1(style="white-space: nowrap") {{ s.serviceName() }}
                        .line2 
                            span $ {{ serviceCost(s) }}            
                            span.service-date {{ serviceDate(s) }}
            .fields
                .ui.coolblue.button.tiny(style="margin-top: 10px; margin-left: 7px" @click="sendPaymentLink" :class="{disabled: !totalOfUnpaidServices}") Send payment link
                .ui.coolgreen.button.tiny(style="margin-top: 10px; margin-left: 40px" @click="addService") Add service
            div(style="padding-top: 10px; color: grey; font-size: 11px")
                p * Services without the $ sign were added to the quote initially and are considered paid when the client has paid the quote
            div(style="padding-top: 20px")
                p(v-if="project.DATE_COMPLETED") Project was completed on {{ utils.formatDate(project.DATE_COMPLETED, "D MMM YYYY HH:mm")}}
                p(v-if="project.IS_NOTARIZED") Project is notarized
        div(style="flex: 1 1 auto")
            div(v-show="service.PK" style="padding-right: 0")
                .fields
                    .inline.field
                        label Cost
                        TWInput(float :obj="service" placeholder="Cost" field="COST" style="width: 80px" :change="updateService")
                    .inline.field(v-if="service.SERVICE_TYPE === C_.psExtraCopies")
                        label Extra copies
                        TWInput(float :obj="service" placeholder="Extra copies" field="ITEM_COUNT" style="width: 80px" :change="updateService") 
                .field 
                .field 
                    label Details (only for project managers)
                    TWTextArea(:rows="6" :obj="service" field="SERVICE_DETAILS" :change="updateService")
    h5.ui.header Payments made by the client
    ProjectPayments(:project="project")
    .div-zero(slot="page-extras")
        TWContextMenu(ref="servicesContextMenu")
            .menu(slot="menu-items")
                .item(@click="deleteService") Delete service
        //- MODAL Add a new service
        #modal-add-service.ui.small.modal
            .header Add a service for project {{ project.PROJECT_NUMBER }}
            i.close.icon
            .content
                .ui.form
                    .field
                        TWDropdown(defaultText="Service type" :obj="newService" field="SERVICE_TYPE" :items="C_.projectServiceTypes" :change="updateNewService" itemKey="SERVICE_TYPE")
                    .fields
                        .field
                            TWInput(float :obj="newService" placeholder="Cost" field="COST" :change="updateNewService") 
                        .field(v-if="newService.SERVICE_TYPE === C_.psExtraCopies")
                            TWInput(integer :obj="newService" placeholder="Extra copies" field="ITEM_COUNT" :change="updateNewService")
                    p Certified Translation Extra Services to Order
                    div(style="padding-left: 20px; padding-bottom: 10px")
                        p 10$ - Digital certification
                        p 10$ - Extra copy (without notarization)
                        p 30$ - Extra copy (with notarization)
                        p 20$ - Notarization per page or per document 
                    p Certified Translation add ons after the project has been delivered
                    div(style="padding-left: 20px")
                        p 10$ - Changes to be made after the certification has been done
                        p 20$ - Notarization per page or per document
                        p 10$ - Digital certification
            .actions
                .ui.cancel.button Cancel
                .ui.button.green(@click="doAddService" :class="{disabled: !newService.SERVICE_TYPE}") Add service
                //- This hidden button is used to close the modal. The one above should not close it, as there might be questions in the form.
                .ui.button.positive.dummy-add-service-button(style="display: none")
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import ProjectPayments from "./Components/ProjectPayments"

export default {
    mixins: [CoreMixin],

    components: {
        ProjectPayments
    },

    props: {
        project: Object
    },

    created() {
        this.utils = utils
        this.C_ = C_
    },

    data() {
        return {
            service: {},
            serviceForContext: undefined,
            newService: {}
        }
    },

    computed: {
        totalOfUnpaidServices() {
            let totalToPay = 0
            for (let service of this.project.services()) if (!service.IS_PAID && !service.WAS_INITIAL) totalToPay += service.COST
            return totalToPay
        },

        services() {
            return this.project.services().sort((a, b) => b.PK - a.PK)
        }
    },

    methods: {
        selectService(service) {
            this.service = service
        },

        async deleteService() {
            const service = this.serviceForContext
            if (!service || !service.PK) return

            if (this.$checkWithMessage(service.IS_PAID, "This service was paid for by the client. You can not delete it anymore.")) return

            if (!(await this.$dialogCheck(`Are you sure you want to delete this service?`))) return

            // Clear the selected service if it's the one that is going to be deleted
            if (service === this.service) this.service = {}

            if (service.WAS_INITIAL) {
                // Set WAS_INITIAL to false, so it doesn't include this service in the calculated price. It is going to be deleted anyway
                service.WAS_INITIAL = false
                this.updateInitialServicesCost()
            }

            // Check if the projects doesn't have other notarization services and unset IS_NOTARIZED
            if (service.SERVICE_TYPE === C_.psNotarization) {
                let isNotarized = false
                this.project.services().forEach(s => {
                    if (s.SERVICE_TYPE === C_.psNotarization && s.PK != service.PK) isNotarized = true
                })
                if (!isNotarized) cmg.updateObject(this.project, "IS_NOTARIZED", false)
            }

            // Check if the projects doesn't have other digital certification services and unset DIGITAL_CERTIFICATION_STATUS
            if (service.SERVICE_TYPE === C_.psDigitalCertification) {
                let hasDigitalCertification = false
                this.project.services().forEach(s => {
                    if (s.SERVICE_TYPE === C_.psDigitalCertification && s.PK != service.PK) hasDigitalCertification = true
                })
                if (!hasDigitalCertification && this.project.DIGITAL_CERTIFICATION_STATUS === 1) cmg.updateObject(this.project, "DIGITAL_CERTIFICATION_STATUS", 0)
            }

            cmg.deleteObject(service)
        },

        contextMenu(event, item) {
            this.serviceForContext = item
            this.$refs.servicesContextMenu.show(event)
            if (window.getSelection) window.getSelection().removeAllRanges()
        },

        updateService(field, value) {
            if (!this.service) return
            cmg.updateObject(this.service, field, value)
            if (field === "COST") this.service.COST = value // So that the new value is used in updateInitialServicesCost()
            if (field === "COST" && this.service.WAS_INITIAL) this.updateInitialServicesCost()
        },

        updateNewService(field, value) {
            this.$set(this.newService, field, value)
            if (field === "SERVICE_TYPE") {
                if (value === C_.psNotarization && !this.newService.COST) this.updateNewService("COST", 20)
                if (value === C_.psDigitalCertification && !this.newService.COST) this.updateNewService("COST", 10)
                if (value === C_.psDMVForm && !this.newService.COST) this.updateNewService("COST", 10)
            }
        },

        toggleServicePaid(service) {
            if (service.WAS_INITIAL) return
            const newValue = !service.IS_PAID
            cmg.updateObject(service, "IS_PAID", newValue)
            this.$set(service, "IS_PAID", newValue)
        },

        toggleServiceCompleted(service) {
            const newValue = !service.IS_COMPLETED
            cmg.updateObject(service, "IS_COMPLETED", newValue)
            this.$set(service, "IS_COMPLETED", newValue)
        },

        async sendPaymentLink() {
            if (!this.totalOfUnpaidServices) {
                this.$showMessage("There are no services (besides initial services, if any) to be paid for.")
                return
            }

            if (await this.$dialogCheck(`Do you want to send the client an email with the link to pay $ ${this.totalOfUnpaidServices.toFixed(2)} for additional services?`))
                cmg.sendEmailWithPaymentLink(this.project, this.totalOfUnpaidServices)
        },

        addService() {
            this.newService = {}
            this.showModal("#modal-add-service", { autofocus: false })
        },

        async doAddService() {
            if (!this.newService.COST) if (!(await this.$dialogCheck("Are you sure you want to add a service with a cost of 0?"))) return

            $(".dummy-add-service-button").click()
            const newService = {
                table: "PROJECTS_SERVICES",
                PROJECT_ID: this.project.PK,
                SERVICE_TYPE: this.newService.SERVICE_TYPE,
                COST: this.newService.COST || 0,
                ITEM_COUNT: this.newService.ITEM_COUNT || 0
            }
            if (this.project.STATUS === C_.psQuote) newService.WAS_INITIAL = true
            cmg.insertObject(newService)

            if (newService.SERVICE_TYPE === C_.psNotarization && !this.project.IS_NOTARIZED) cmg.updateObject(this.project, "IS_NOTARIZED", true)
            if (newService.SERVICE_TYPE === C_.psNotarization && !this.project.IS_CERTIFIED) cmg.updateObject(this.project, "IS_CERTIFIED", true)
            if (newService.SERVICE_TYPE === C_.psCertification && !this.project.IS_CERTIFIED) cmg.updateObject(this.project, "IS_CERTIFIED", true)
            if (newService.SERVICE_TYPE === C_.psDigitalCertification) cmg.updateObject(this.project, "DIGITAL_CERTIFICATION_STATUS", 1)

            if (newService.WAS_INITIAL) this.updateInitialServicesCost(newService)

            if (!newService.WAS_INITIAL && newService.SERVICE_TYPE === C_.psDigitalCertification && this.project.PREPAYMENT_STATUS === C_.ppsPrepaymentDone)
                cmg.updateObject(this.project, "PREPAYMENT_STATUS", C_.ppsPrepaymentPartlyDone)
        },

        updateInitialServicesCost(newProjectService) {
            let cost = 0
            for (let service of this.project.services()) if (service.WAS_INITIAL) cost += service.COST
            if (newProjectService) cost += newProjectService.COST
            cmg.updateObject(this.project, "INITIAL_SERVICES_COST", cost)
        },

        serviceDate(service) {
            let format = "D MMM YYYY HH:mm"
            if (utils.isThisYear(service.SERVICE_DATE)) format = "D MMM, HH:mm"
            return utils.formatDate(service.SERVICE_DATE, format)
        },

        serviceCost(service) {
            const cost = service.COST || 0
            return cost.toFixed(2)
        }
    },

    watch: {
        project(newValue, oldValue) {
            if (newValue !== oldValue) {
                this.service = {}
            }
        }
    }
}
</script>

<style scoped>
#projects-services-page-wrapper {
    width: 100%;
    height: 100%;
    padding: 0 20px;
    display: flex;
    flex-direction: column;
}

#projects-services-wrapper {
    flex-grow: 0;
    border: 1px solid lightgrey;
    border-radius: 4px;
    height: 200px;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: white;
}

.services-list-item {
    height: 54px;
    border-bottom: 1px solid rgb(202, 202, 202);
    display: flex;
    padding-top: 5px;
    cursor: pointer;
}

.services-list-item.selected {
    background-color: rgb(234, 243, 243);
}

.paid-tag-wrapper {
    cursor: pointer;
    font-weight: 700;
    padding: 16px 8px 0 6px;
}

.completed-tag-wrapper {
    padding: 16px 8px 0 6px;
}

.services-list-item .line1 {
    padding-top: 3px;
    font-weight: 700;
    font-size: 12px;
}

.services-list-item .line2 {
    font-size: 12px;
    padding-top: 2px;
    width: 300px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.service-date {
    padding-left: 25px;
}
</style>
