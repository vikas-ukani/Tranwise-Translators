<template lang="pug">
#quotes-wrapper(style="max-width: 700px !important; margin-left: 0 !important; padding-bottom: 20px")
    .ui.header(v-if="store.didLoadQuotes") Quotes
    .ui.text.active.loader(v-if="!store.didLoadQuotes") Loading quotes...
    #quotes-list-wrapper(v-else-if="quotes.length")
        p This is a list of the quotes we have pending for you. Click on the details button to view and accept it.
        QuotesListItem(v-for="quote in quotes" :quote="quote" :store="store" :key="quote.PK")
    p(v-else) We do not have any pending quotes created for you at the moment.         
</template>

<script>
import utils from "../UtilsCL"
import QuotesListItem from "./QuotesListItemCL"

export default {
    components: {
        QuotesListItem
    },

    props: {
        store: Object
    },

    computed: {
        quotes() {
            return Object.values(this.store.quotes)
        }
    }
}
</script>
