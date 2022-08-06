<template lang="pug">
.ui.form.tiny
    TWDropdown(ref="dropdown" showall upward allowSelectionOfSameValue :defaultText="defaultText" :change="applyFilter" :selectItem="selectItem" :items="filters" itemKey="NAME")
    #date-selector-wrapper(v-show="shouldShowDateSelector")
        DateSelector(date-only :change="selectDate")
    #month-selector-wrapper(v-show="shouldShowMonthSelector")
        DateSelector(month-only :change="selectMonth")
    #modal-certificate-type.ui.small.modal
        .header Filter projects by certificate type
        .content
            .ui.form
                .three.fields
                    TWDropdown(ref="DropdownCertificateType" defaultText="Certificate type" search showall allowSelectionOfSameValue field="CERTIFICATE_TYPE" :items="C_.certificateTypes" :change="selectCertificateType" itemKey="CERTIFICATE_TYPE")
                    div(style="width: 20px")
                    TWDropdown(ref="DropdownCertificateCountry" defaultText="Certificate country" search allowSelectionOfSameValue field="COUNTRY_ID" :items="store.countries" :change="selectCertificateCountry" itemKey="COUNTRY")
        .actions
            .ui.cancel.button(@click="cancelCertificateTypeFilter") Cancel
            #apply-certificate-filter-button.ui.positive.button(style="display: none" @click="applyCertificateTypeFilter") Filter        
</template>

<script>
import { store, utils, cmg, constants as C_ } from "../CoreModules"
import DateSelector from "../../Shared/components/DateSelector"

export default {
    components: {
        DateSelector
    },

    data() {
        return {
            dateForFilter: undefined,
            monthForFilter: undefined,
            certificateTypeForFilter: undefined,
            certificateCountryForFilter: undefined,
            shouldShowDateSelector: false,
            shouldShowMonthSelector: false
        }
    },

    props: {
        // Used to show "Projects for client" in the dropdown if the client filter was selected
        filterTitle: String,
        statusFilters: Array
    },

    created() {
        this.store = store
        this.C_ = C_
    },

    computed: {
        filters() {
            return [
                { PK: "All", NAME: "Show all projects" },
                { PK: "DeadlineToday", NAME: "Deadline today" },
                { PK: "DeadlineOnDate", NAME: "Deadline on date" },
                { PK: "DeadlineOnMonth", NAME: "Deadline on month" },
                { PK: "DeadlinePassed", NAME: "Deadline passed" },
                { PK: "Big", NAME: "Big projects" },
                { PK: "ReadyByTranslator", NAME: "Ready by translator" },
                { PK: "ReadyByProofreader", NAME: "Ready by proofreader" },
                { PK: "ReadyForCertification", NAME: "Ready for certification" },
                { PK: "CertifiedNotarized", NAME: "Certified / Notarized" },
                { PK: "NotShipped", NAME: "Not shipped" },
                { PK: "Prepaid", NAME: "Prepaid" },
                { PK: "PaidQuotes", NAME: "Paid quotes" },
                { PK: "CATTools", NAME: "Has CAT tools" },
                { PK: "DigitalCertification", NAME: "Digital certification" },
                { PK: "PendingRefunds", NAME: "Pending refunds" },
                { PK: "CertificateType", NAME: "Filter by certificate type" }
            ]
        },

        defaultText() {
            return this.filterTitle.length ? this.filterTitle : "All projects"
        }
    },

    methods: {
        applyFilter(_, value) {
            if (value === "CertificateType") {
                this.certificateTypeForFilter = -1
                this.certificateCountryForFilter = -1
            }

            // If DeadlineOnDate or DeadlineOnMonth was selected, don't emit the event, as the calendar will be shown
            // (triggered by selectItem below) and the event will be emmited when a date is selected
            if (!["DeadlineOnDate", "DeadlineOnMonth"].includes(value)) this.$emit("applyFilter", value)

            if (value === "PendingRefunds") {
                // First unset the PAYMENT_ID field for all the projects in the store, so that we get the updated value
                // when requesting the objects from the server
                store.projects.forEach(project => (project.PAYMENT_ID = null))

                // Request the projects that have pending refunds
                cmg.requestObjects("PROJECTS_WITH_PENDING_REFUNDS")
            }
        },

        setFilterNameForFilter(filter) {
            for (let f of this.filters) {
                if (f.PK === filter && f.PK != "All") {
                    this.$refs.dropdown.setText(f.NAME)
                    return
                }
            }
        },

        selectItem(itemText) {
            if (itemText === "Deadline on date") this.shouldShowDateSelector = true
            if (itemText === "Deadline on month") this.shouldShowMonthSelector = true
            if (itemText === "Filter by certificate type") {
                this.$refs.DropdownCertificateType.reset()
                this.$refs.DropdownCertificateCountry.reset()
                setTimeout(() => utils.showModal("#modal-certificate-type", { autofocus: false, duration: 0 }), 200)
            }
        },

        selectDate(date) {
            this.dateForFilter = date
            this.shouldShowDateSelector = false
            this.$emit("applyFilter", "DeadlineOnDate")
        },

        selectMonth(date) {
            this.monthForFilter = date
            this.shouldShowMonthSelector = false
            this.$emit("applyFilter", "DeadlineOnMonth")
        },

        selectCertificateType(field, value) {
            this.certificateTypeForFilter = value
        },

        selectCertificateCountry(field, value) {
            this.certificateCountryForFilter = value
            $("#apply-certificate-filter-button").click()
        },

        applyCertificateTypeFilter() {
            if (!this.statusFilters.includes(C_.psCompleted)) this.$emit("updateStatusFilters", C_.psCompleted)
            if (this.certificateTypeForFilter > 0 && this.certificateCountryForFilter > 0)
                cmg.requestObjects("PROJECTS_WITH_CERTIFICATE_TYPE", {
                    CERTIFICATE_TYPE: this.certificateTypeForFilter,
                    CERTIFICATE_COUNTRY: this.certificateCountryForFilter
                }).then(() => {
                    this.$emit("applyFilter", "CertificateType")
                    this.$refs.dropdown.setText("Filter by certificate type")
                })
        },

        cancelCertificateTypeFilter() {
            this.certificateTypeForFilter = -1
            this.certificateCountryForFilter = -1
            this.$refs.dropdown.setText("Show all projects")
            this.$emit("applyFilter", "All")
        },

        filterFunctions() {
            // Returns the project's deadline based on status (reopened) and deadline intermediate
            function deadlineForComparison(p) {
                let deadlineField = p.deadlineField()
                if (p.DEADLINE_INTERMEDIATE > 0 && utils.isSameDay(p.DEADLINE_INTERMEDIATE, store.serverTime())) deadlineField = "DEADLINE_INTERMEDIATE"
                return p[deadlineField]
            }

            return {
                DeadlineToday: p => utils.day(deadlineForComparison(p)) <= utils.day(store.serverTime()) || p.STATUS === C_.psReopened,

                DeadlineOnDate: p => utils.day(deadlineForComparison(p)) === utils.day(this.dateForFilter) || p.STATUS === C_.psReopened,

                DeadlineOnMonth: p =>
                    utils.month(deadlineForComparison(p)) === utils.month(this.monthForFilter) && utils.year(deadlineForComparison(p)) === utils.year(this.monthForFilter),

                DeadlinePassed: p => utils.day(deadlineForComparison(p)) < utils.day(store.serverTime()) || p.STATUS === C_.psReopened,

                Big: p => p.IS_BIG,

                ReadyByTranslator: p => {
                    const cs = p.completionStatus
                    return cs && cs[0] === cs[1] && cs[0] > 0
                },

                ReadyByProofreader: p => {
                    const cs = p.completionStatus
                    return cs && cs[2] === cs[3] && cs[2] > 0
                },

                ReadyForCertification: p => p.CLIENT_APPROVAL_STATUS && p.isInProgress(),

                CertifiedNotarized: p => p.IS_CERTIFIED || p.IS_NOTARIZED,

                CertificateType: p => p.CERTIFICATE_TYPE === this.certificateTypeForFilter && p.CERTIFICATE_COUNTRY === this.certificateCountryForFilter,

                NotShipped: p =>
                    p.isCompleted() &&
                    ((p.SHIPPING_METHOD > 0 && utils.isBlank(p.SHIPPING_TRACKING_NUMBER)) || (p.CLIENT_REQUESTED_EXTRA_COPIES && utils.isBlank(p.ADDITIONAL_TRACKING_NUMBER))),

                Prepaid: p => p.PREPAYMENT_STATUS > 0,

                PaidQuotes: p => p.PREPAYMENT_STATUS === C_.ppsPrepaymentDone && [C_.psQuote, C_.psSetup].includes(p.STATUS),

                CATTools: p => p.CAT_TOOLS.includes("1") || p.CAT_TOOLS_OTHER.trim(),

                DigitalCertification: p =>
                    p.DIGITAL_CERTIFICATION_STATUS === 1 && (p.PREPAYMENT_STATUS === C_.ppsPrepaymentDone || p.PREPAYMENT_STATUS === C_.ppsPrepaymentPartlyDone),

                // The PAYMENT_ID is a field of PROJECTS_REFUNDS, but it's set on the project when requesting PROJECTS_WITH_PENDING_REFUNDS
                PendingRefunds: p => p.PAYMENT_ID
            }
        }
    }
}
</script>

<style scoped>
#date-selector-wrapper,
#month-selector-wrapper {
    position: fixed;
    z-index: 100;
    left: 0;
    bottom: 33px;
}
</style>
