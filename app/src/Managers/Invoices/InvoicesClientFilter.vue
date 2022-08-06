<template lang="pug">
div(style="flex: 1 1 auto")
    .ui.search#invoices-client-selector
        .ui.icon.input
            input.prompt(style="border-radius: 0" type="text" placeholder="Invoices for client..." v-model="filterValue")
            i.close.link.icon(v-if="filterValue" @click="filterValue = ''")
            i.search.icon(v-else)
        .results.client-selector-results
</template>

<script>
import { store, cmg, utils, constants as C_ } from "../CoreModules"

export default {
    data() {
        return {
            filterValue: ""
        }
    },

    methods: {
        buildSearchQuery() {
            const query = this.filterValue.toLowerCase()
            const maxItems = 12

            const clients = []
            for (let client of store.clients)
                if (client.CLIENT_NAME && client.CLIENT_NAME.toLowerCase().includes(query)) clients.push({ id: client.PK, title: client.CLIENT_NAME.trim() })

            clients.sort((a, b) => {
                const aa = a.title.toLowerCase()
                const bb = b.title.toLowerCase()

                // The list should have the clients that start with the query at the top, and only then the clients
                // that include the query, but don't start with it
                // Eg. For query = "xy", client xyz comes first, and then client abcxy
                if (aa.startsWith(query) && !bb.startsWith(query)) return -1
                if (!aa.startsWith(query) && bb.startsWith(query)) return 1
                return aa.localeCompare(bb)
            })

            this.refreshSearchSettings(clients.slice(0, maxItems))
        },

        refreshSearchSettings(source) {
            $("#invoices-client-selector").search({
                source: source,
                searchFields: ["title"],
                cache: false,
                maxResults: 12,
                onSelect: this.onSearchSelect
            })
        },

        onSearchSelect(result) {
            this.$emit("selectClientID", result.id)
        },

        // This is called from InvoicesMain when selecting a client via "Show invoices for client"
        setText(clientName) {
            $("#invoices-client-selector").search("set value", clientName)
            this.filterValue = clientName
        }
    },

    watch: {
        filterValue(newValue) {
            if (newValue) this.buildSearchQuery()
            else this.$emit("clearClient")
        }
    }
}
</script>