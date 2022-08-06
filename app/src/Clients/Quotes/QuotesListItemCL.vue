<template lang="pug">
.quote-list-item-wrapper
    .ui.grid
        .ui.five.wide.column {{ quote.NUMBER }}
        .ui.five.wide.column {{ quote.DATE }}
        .ui.six.wide.column {{ utils.currencySymbols[quote.CURRENCY] }} {{ quote.PRICE.toFixed(2) }}
    .ui.grid(style="margin-top: 0")
        .ui.twelve.wide.column {{ quote.LANGUAGE }} > {{ targetLanguage }}
        .ui.four.wide.column.bottom.aligned(v-if="shouldShowDetails" style="text-align: right; cursor: pointer" @click="shouldShowDetails = false") Close details &#x25B2;
        .ui.four.wide.column.bottom.aligned(v-else style="text-align: right; cursor: pointer" @click="shouldShowDetails = true") Details &#x25BC;
    QuoteDetails(v-if="shouldShowDetails" :quote="quote" :store="store")
</template>

<script>
import utils from "../UtilsCL"
import QuoteDetails from "./QuoteDetailsCL"

export default {
    components: {
        QuoteDetails
    },

    props: {
        quote: Object,
        store: Object
    },

    data() {
        return {
            shouldShowDetails: false
        }
    },

    created() {
        this.utils = utils
    },

    mounted() {
        if (this.store.quoteIDForDetails === this.quote.PK) this.shouldShowDetails = true
    },

    computed: {
        targetLanguage() {
            if (!this.quote.TARGET.includes(",")) return this.quote.TARGET

            const targets = this.quote.TARGET.split(",")
            return targets[0] + " + " + (targets.length - 1) + " more"
        }
    },

    methods: {
        selectQuote() {
            this.$emit("selectQuote", this.quote)
        }
    }
}
</script>

<style scoped>
.quote-list-item-wrapper {
    border: thin solid rgb(124, 153, 172);
    margin: 10px 0;
    padding: 15px;
    border-radius: 5px;
    background-color: rgb(245, 248, 252);
}
</style>
