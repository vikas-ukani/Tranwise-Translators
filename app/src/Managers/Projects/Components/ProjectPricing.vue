<template lang="pug">
.ui.form
    .fields
        .field
            TWDropdown(v-if="project.IS_CERTIFIED" defaultText="Pricing method" :obj="project" field="CERTIFIED_PAYMENT_METHOD" :items="C_.projectCertifiedPricingMethods" :change="updateProjectPrice" itemKey="PAYMENT" style="width: 180px")
            TWDropdown(v-else defaultText="Pricing method" :obj="project" field="PAYMENT_CLIENT" :items="C_.projectPricingMethods" :change="updateProjectPrice" itemKey="PAYMENT" style="width: 180px")
        .field
            TWDropdown(defaultText="Currency" ref="dropdownCurrency" :obj="project" field="CURRENCY" :items="C_.currencies" :change="updateProjectPrice" itemKey="CURRENCY" style="width: 100px")
        .field.vertical-center(v-if="project.VAT_RATE") {{ project.VAT_RATE }} % VAT
    div(v-if="project.IS_CERTIFIED")
        //- Fixed price
        .fields(v-if="project.CERTIFIED_PAYMENT_METHOD === C_.ptFixedPrice")
            .field
                .ui.right.labeled.input
                    TWInput(float :obj="project" field="CERTIFIED_BASE_PRICE" placeholder="0" :change="updateProjectPrice" style="width: 102px; text-align: right")
                    .ui.basic.label {{ currencySymbol }}
        .fields(v-if="project.CERTIFIED_PAYMENT_METHOD === C_.ptBySourceWords")
            .field
                .ui.right.labeled.input
                    TWInput(integer :obj="project" field="SOURCE_WORDS" placeholder="0" :change="updateProjectPrice" style="width: 70px; text-align: right")
                    .ui.basic.label(style="padding-right: 12px") words
            .field.vertical-center x
            .field
                .ui.right.labeled.input
                    TWInput(float :obj="project" field="CERTIFIED_PRICE_PER_WORD" placeholder="0" :change="updateProjectPrice" style="width: 65px; text-align: right")
                    .ui.basic.label {{ currencySymbol }} / word
            .field.vertical-center(style="word-spacing: .4em") = {{ utils.roundPrice(project.SOURCE_WORDS * project.CERTIFIED_PRICE_PER_WORD) || 0 }} {{ currencySymbol }}
        .fields(v-if="project.CERTIFIED_PAYMENT_METHOD === C_.ptByPages")
            .field
                .ui.right.labeled.input
                    TWInput(integer :obj="project" field="PAGES_COUNT" placeholder="0" :change="updateProjectPrice" style="width: 70px; text-align: right")
                    .ui.basic.label(style="padding-right: 14px") pages
            .field.vertical-center x
            .field
                .ui.right.labeled.input
                    TWInput(float :obj="project" field="CERTIFIED_PRICE_PER_PAGE" placeholder="0" :change="updateProjectPrice" style="width: 65px; text-align: right")
                    .ui.basic.label {{ currencySymbol }} / page
            .field.vertical-center(style="word-spacing: .4em") = {{ utils.roundPrice(project.PAGES_COUNT * project.CERTIFIED_PRICE_PER_PAGE) || 0 }} {{ currencySymbol }}
        //- These fields were used when documents were shipped to clients. Not used anymore.
        //- .fields.disabled
            .field.vertical-center(style="word-spacing: .4em")
                .ui.right.labeled.input
                    TWInput(integer :obj="project" field="PRINT_COPIES_COUNT" placeholder="0" :change="updateProjectPrice" style="width: 70px; text-align: right")
                    .ui.basic.label copies
            .field.vertical-center x
            .field
                .ui.right.labeled.input
                    TWInput(float :obj="project" field="PRICE_PER_PRINT_COPY" placeholder="0" :change="updateProjectPrice" style="width: 65px; text-align: right")
                    .ui.basic.label {{ currencySymbol }} / copy
            .field.vertical-center(style="word-spacing: .4em") = {{ utils.roundPrice(project.PRINT_COPIES_COUNT * project.PRICE_PER_PRINT_COPY) || 0 }} {{ currencySymbol }}
        //- .fields.inline
            .ui.button.violet.small.inverted.disabled(style="margin-right: 15px; padding-left: 14px; padding-right: 14px" @click="explainExtraCosts") Explain extra costs
            .ui.right.labeled.input.disabled
                TWInput(float :obj="project" field="EXTRA_COSTS" placeholder="0" :change="updateProjectPrice" style="width: 65px; text-align: right")
                .ui.basic.label {{ currencySymbol }} extra costs
    //- Not certified
    div(v-else)
        //- Fixed price
        .fields(v-if="project.PAYMENT_CLIENT == C_.ptFixedPrice")
            .field
                .ui.right.labeled.input
                    TWInput(float :obj="project" field="PRICE" placeholder="0" :change="updateProjectPrice" style="width: 90px; text-align: right")
                    .ui.basic.label {{ currencySymbol }}
        //- By source words
        .fields(v-if="project.PAYMENT_CLIENT == C_.ptBySourceWords")
            .field
                .ui.right.labeled.input
                    TWInput(integer :obj="project" field="SOURCE_WORDS" placeholder="0" :change="updateProjectPrice" style="width: 75px; text-align: right")
                    .ui.basic.label words
            .field.vertical-center x
            .field
                .ui.right.labeled.input
                    TWInput(float :obj="project" field="PRICE" placeholder="0" :change="updateProjectPrice" style="width: 65px; text-align: right")
                    .ui.basic.label {{ currencySymbol }} / word
            .field.vertical-center(style="word-spacing: .4em") = {{ utils.roundPrice(this.project.SOURCE_WORDS * this.project.PRICE || 0) }} {{ currencySymbol }}
        //- By target words
        .fields(v-if="project.PAYMENT_CLIENT == C_.ptByTargetWords")
            .field
                .ui.right.labeled.input
                    TWInput(float :obj="project" field="PRICE" placeholder="0" :change="updateProjectPrice" style="width: 70px; text-align: right")
                    .ui.basic.label {{ currencySymbol }} / target word
        //- By CAT analysis
        div(v-if="project.PAYMENT_CLIENT == C_.ptByCatAnalysis")
            .inline.fields
                .field
                    TWInput(integer :obj="project" field="WORDS_NO_MATCH" placeholder="0" :change="updateProjectPrice" style="width: 70px; text-align: right")
                .field.vertical-center x
                .field
                    .ui.right.labeled.input
                        TWInput(float :obj="project" field="RATE_NO_MATCH" placeholder="0" :change="updateProjectPrice" style="width: 60px; text-align: right")
                        .ui.basic.label(style="width: 130px") {{ currencySymbol }} / no match
                .field.vertical-center(style="word-spacing: .4em") = {{ utils.roundPrice(this.project.WORDS_NO_MATCH * this.project.RATE_NO_MATCH || 0) }} {{ currencySymbol }}
            .fields
                .field
                    TWInput(integer :obj="project" field="WORDS_FUZZY_MATCH" placeholder="0" :change="updateProjectPrice" style="width: 70px; text-align: right")
                .field.vertical-center x
                .field
                    .ui.right.labeled.input
                        TWInput(float :obj="project" field="RATE_FUZZY_MATCH" placeholder="0" :change="updateProjectPrice" style="width: 60px; text-align: right")
                        .ui.basic.label(style="width: 130px") {{ currencySymbol }} / fuzzy match
                .field.vertical-center(style="word-spacing: .4em") = {{ utils.roundPrice(this.project.WORDS_FUZZY_MATCH * this.project.RATE_FUZZY_MATCH || 0) }} {{ currencySymbol }}
            .fields
                .field
                    TWInput(integer :obj="project" field="WORDS_REPS" placeholder="0" :change="updateProjectPrice" style="width: 70px; text-align: right")
                .field.vertical-center x
                .field
                    .ui.right.labeled.input
                        TWInput(float :obj="project" field="RATE_REPS" placeholder="0" :change="updateProjectPrice" style="width: 60px; text-align: right")
                        .ui.basic.label(style="width: 130px") {{ currencySymbol }} / 100% & reps
                .field.vertical-center(style="word-spacing: .4em") = {{ utils.roundPrice(this.project.WORDS_REPS * this.project.RATE_REPS || 0) }} {{ currencySymbol }}
    .fields
        .field.inline
            TWInput(:obj="project" field="STUDENT_EMAIL" placeholder="Student Email" :change="updateProject" ) 
    .fields
        .field.inline
                TWCheckbox(label="10% Student discount" :obj="project" :change="updateProject" field="STUDENT_DISCOUNT" :value="studentHasDiscount")

</template>

<script>
import { store, cmg, utils, constants as C_ } from "../../CoreModules"
import ProjectComponentsMixin from "./ProjectComponentsMixin"

export default {
    mixins: [ProjectComponentsMixin],

    computed: {
        currencySymbol() {
            if (this.project.CURRENCY) return C_.currencySymbols[this.project.CURRENCY]
            else return ""
        },

        studentHasDiscount() {
            if (!this.project || !this.project.PK) return false
            return this.project.STUDENT_DISCOUNT === 1
        },
    },

    methods: {
        updateProjectPrice(field, value) {
            if (this.project.INVOICE_ID && !store.permissions.updateInvoicedProjectsPrice) {
                this.$showMessage("This project already has an invoice created. You are not allowed to update the price.")
                return
            }

            this.updateProject(field, value)
            if (value === C_.ptByPages && !this.project.CERTIFIED_PRICE_PER_PAGE) this.updateProject("CERTIFIED_PRICE_PER_PAGE", 20)
        },

        updateProject(field, value) {
            // If updateProjectAction is defined, it means that the module was instantiated by ProjectsCreate
            if (this.updateProjectAction) this.updateProjectAction(field, value)
            else cmg.updateObject(this.project, field, value)
        },

        async explainExtraCosts() {
            const response = await this.$showDialog({
                header: "Explain extra costs",
                message: "Explain below how the total extra costs are calculated:",
                textAreaText: this.project.EXTRA_COSTS_DETAILS,
                buttons: ["Cancel", "Save"],
                buttonClasses: ["", "positive"]
            })

            if (response.selection === "Save") this.updateProject("EXTRA_COSTS_DETAILS", response.text)
        }
    },

    watch: {
        project() {
            if (this.project.CURRENCY != this.currency) {
                this.$refs.dropdownCurrency.setValue(this.currency)
                this.currency = this.project.CURRENCY
            }
        }
    }
}
</script>
