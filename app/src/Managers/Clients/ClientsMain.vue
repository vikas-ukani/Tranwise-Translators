<template lang="pug">
PageBase(headerText="Clients" headerWidth="266")
    #header-buttons-wrapper(slot="header-buttons")
        .ui.button.coolblue.small(@click="showClientCreator") Create a client
    ListAndDetailsBase(ref="list" slot="page-contents" :items="clients" :selectedObject="client" :listWidth="250" :listItemHeight="40" )
        #list-header(slot="list-header")
            .field.ui.form
                input#input-filter-clients(type="text" v-model="clientsFilter" placeholder="Filter clients...")
                div(style="height: 1px; border-bottom: 1px solid #aeb3b6")
        .list-item(slot="list-item" slot-scope="{item}" @click="selectClient(item.PK)" @contextmenu.prevent="contextMenu($event, item)")
            div(style="height: 39px; display: flex; flex-direction: row")
                .inline.client-name-list {{ item.CLIENT_NAME }}
                div(style="padding: 10px 10px 0 0")
        #clients-filter-wrapper.ui.form.tiny(slot="list-footer")
            div
                TWCheckbox(label="Only Pays by check" :value="filterPaysByCheck" field="PaysByCheck" :change="updateFilter")
        #clients-details-container.ui.form(slot="details")
            ClientsDetails(:client="client" v-if="client.PK")
    .div-zero(slot="page-extras")
        TWContextMenu(ref="listContextMenu")
            .menu(slot="menu-items")
                .item(@click="showProjectsForClient") Show projects for client
        ClientsCreate(:client="newClient" ref="clientsCreate" @createClient="doCreateClient")
</template>

<script>
import ClientsDetails from "./ClientsDetails"
import ClientsCreate from "./ClientsCreate"
import { store, cmg, constants, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    components: {
        ClientsDetails,
        ClientsCreate
    },

    props: {
        // When selecting an object from the search bar (or any other find method), the object is stored in this prop
        objectFromFind: Object
    },

    data() {
        return {
            pageState: ["client", "clientsFilter", "filterPaysByCheck"],
            newClient: {},
            client: {},
            clientsFilter: "",
            clientForContext: undefined,
            hasMandatoryProblems: false,
            filterPaysByCheck: false
        }
    },

    mounted() {
        // If objectFromFind is set, then we came here from a find request, so set the client to objectFromFind
        if (this.objectFromFind && this.objectFromFind.table === "CLIENTS") {
            this.selectClient(this.objectFromFind.PK)
            setTimeout(() => {
                this.$refs.list.scrollToItemWithPK(this.objectFromFind.PK)
            }, 100)
        }
    },

    computed: {
        clients() {
            const nameFilter = utils
                .escapeString(this.clientsFilter.toLowerCase())
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
            const emailFilter = utils.isValidEmail(this.clientsFilter.toLowerCase()) ? this.clientsFilter.toLowerCase() : null

            let result = store.clients.filter(c => {
                if (this.filterPaysByCheck && !c.PAYS_BY_CHECK) return false
                if (emailFilter)
                    return (
                        (c.EMAILS || "").toLowerCase().includes(emailFilter) ||
                        (c.EMAIL_FOR_INVOICES || "").toLowerCase().includes(emailFilter) ||
                        (c.ACCOUNTING_EMAIL || "").toLowerCase().includes(emailFilter)
                    )

                if (!c.filterClientName) return false
                if (nameFilter) return c.filterClientName.match(nameFilter)
                return true
            })
            result = result.sort((a, b) => a.filterClientName.localeCompare(b.filterClientName))
            return result
        }
    },

    methods: {
        async selectClient(pk) {
            this.client = store.client(pk)
            await cmg.requestObject(this.client, "CLIENTS_DETAILS")
            cmg.requestObjectsForObject(this.client, "INVOICE_REMINDERS_FOR_CLIENT")
            this.$emit("addToHistory", { client: this.client })
        },

        async showProjectsForClient(event) {
            cmg.requestObjects("COMPLETED_PROJECTS_FOR_CLIENT", { CLIENT_PK: this.clientForContext.PK })
            await utils.delay(50) // Wait for the menu to close, otherwise we get an error
            this.$emit("showProjectsForClient", this.clientForContext)
        },

        updateFilter(field, value) {
            if (field === "PaysByCheck") {
                this.filterPaysByCheck = value
                cmg.requestObjects("CLIENTS_WITH_PAYS_BY_CHECK")
            }
        },

        contextMenu(event, item) {
            this.clientForContext = item
            this.$refs.listContextMenu.show(event)
            if (window.getSelection) window.getSelection().removeAllRanges()
        },

        showClientCreator() {
            this.newClient = { table: "CLIENTS" }
            this.$refs.clientsCreate.show()
        },

        async doCreateClient() {
            const insertedClient = await cmg.insertObject(this.newClient)
            insertedClient.isLoaded = true
            this.client = insertedClient
            this.$emit("addToHistory", { client: this.client })
        }
    },

    watch: {
        objectFromFind(object, oldObject) {
            if (object && object !== oldObject && object.table === "CLIENTS") {
                this.selectClient(object.PK)
                this.$refs.list.scrollToItemWithPK(object.PK)
            }
        },

        clientsFilter(newValue) {
            if (utils.isValidEmail(newValue.trim())) cmg.requestObjects("CLIENTS_WITH_EMAIL", { EMAIL: newValue })
        }
    }
}
</script>

<style scoped>
#list-search {
    margin: 10px 0 0 10px;
}

.client-icon-wrapper {
    padding: 6px 0 0 10px;
}

.client-name-list {
    padding: 10px 15px;
    font-weight: 300;
    width: 215px;
    text-overflow: ellipsis;
    overflow: hidden;
}

#input-filter-clients {
    border-radius: 0;
    border: 0;
    border-bottom: 1px solid #cad0d3;
    border-top: 1px solid #cad0d3;
    border-right: solid 1px #cad0d3;
    margin-bottom: 1px;
}

#header-buttons-wrapper {
    padding: 10px;
    padding-right: 22px;
}

#clients-filter-wrapper {
    border-top: thin solid #aeb3b6;
    border-right: thin solid #aeb3b6;
    background-color: rgb(249, 253, 253);
    padding: 10px;
}

#clients-details-container {
    height: 100%;
}

.vue-recycle-scroller__item-view.hover {
    background-color: rgb(240, 246, 248);
}
</style>
