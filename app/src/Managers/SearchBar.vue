<template lang="pug">
#search-bar-wrapper.ui.left.icon.input.search.quick-search.small
    i.search.icon
    input#search-bar.prompt.input-quick-search(type="text" placeholder="Search..." @keydown.enter="onPressReturn" @focus="onFocus") 
    .results 
</template>

<script>
import store from "./Store/Store"
import cmg from "./ConnectionManager"
import utils from "./Utils"

export default {
    mounted() {
        this.refreshSearchSource()
    },

    methods: {
        findProjects(query) {
            let projects = []
            for (let project of store.projects) {
                if (!project.PROJECT_NUMBER) continue
                if (project.PROJECT_NUMBER.endsWith("-" + query) || project.PROJECT_NUMBER.toLowerCase() === query) {
                    projects.push({ id: project.PK, title: project.PROJECT_NUMBER, category: "Projects" })
                }
            }
            this.foundProjects = projects
        },

        findProjectForProformaInvoice(query) {
            let projects = []
            const project = store.project(query.substring(3))
            if (project) projects.push({ id: project.PK, title: project.PROJECT_NUMBER, extra: query, category: "Projects" })
            this.foundProjects = projects
        },

        findInvoices(query) {
            let invoices = []
            const invoice = store.invoice(query.includes("-") ? parseInt(query.substr(query.indexOf("-") + 1), 10) : query)
            if (invoice) invoices.push({ id: invoice.PK, title: invoice.invoiceNumber(), category: "Invoices" })
            this.foundInvoices = invoices
        },

        findClients(query) {
            const maxItems = 8
            let storeClients = [...store.clients].sort((a, b) => a.CLIENT_NAME.toLowerCase().localeCompare(b.CLIENT_NAME.toLowerCase()))
            let clients = []
            // First add the clients that start with the query
            for (let client of storeClients) {
                if (client.CLIENT_NAME.toLowerCase().startsWith(query)) {
                    clients.push({ id: client.PK, title: client.CLIENT_NAME + " [" + client.PK + "]", category: "Clients" })
                    if (clients.length >= maxItems) break
                }
            }
            // If the list is not full yet, then add the clients that match the query, but don't start with the query
            if (clients.length < maxItems) {
                for (let client of storeClients) {
                    // Check if the client already is in the list and skip it
                    if (clients.filter(c => c.id === client.PK).length) continue

                    if (client.CLIENT_NAME.toLowerCase().includes(query)) {
                        clients.push({ id: client.PK, title: client.CLIENT_NAME + " [" + client.PK + "]", category: "Clients" })
                        if (clients.length >= maxItems) break
                    }
                }
            }
            this.foundClients = clients
        },

        findEmployees(query) {
            const maxItems = 8
            let employees = []
            /* prettier-ignore */
            let storeEmployees = [...store.employees].sort((a, b) => a.fullName().toLowerCase().localeCompare(b.fullName().toLowerCase()))

            // First add the employees that start with the query
            for (let employee of storeEmployees) {
                /* prettier-ignore */
                if (employee.fullName().toLowerCase().startsWith(query)) {
                    employees.push({ id: employee.PK, title: employee.fullName(), category: "Employees" })
                    if (employees.length >= maxItems) break
                }
            }
            // If the list is not full yet, then add the employees that match the query, but don't start with the query
            for (let employee of storeEmployees) {
                /* prettier-ignore */
                if (employee.fullName().toLowerCase().includes(query)) {
                    // Check if the employee already is in the list and skip it
                    if (employees.filter(e => e.id === employee.PK).length) continue

                    employees.push({ id: employee.PK, title: employee.fullName(), category: "Employees" })
                    if (employees.length >= maxItems) break
                }
            }
            employees.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()))

            this.foundEmployees = employees
        },

        refreshSearchSource() {
            if (this.shouldNotSearch) return
            this.foundItems = [...(this.foundProjects || []), ...(this.foundInvoices || []), ...(this.foundClients || []), ...(this.foundEmployees || [])]
            $("#search-bar-wrapper").search({
                type: "category",
                source: this.foundItems,
                searchFields: ["title", "extra"],
                fullTextSearch: "exact",
                maxResults: 20,
                showNoResults: false,
                onSearchQuery: this.onSearchQuery,
                onSelect: this.onSearchSelect
            })
            if (this.currentQuery) $("#search-bar-wrapper").search("search local", this.currentQuery)
        },

        doSearch(query) {
            if (this.shouldNotSearch) return
            if (query.length < 3) return
            if (query === this.lastQuery) return
            this.lastQuery = query

            // Request projects from the server
            // Only search for projects if the query is a number between 3 and 6 characters or in the format X-some digits
            let queryForProjects = query
            if (RegExp("^.-[0-9]{2,6}$").test(query)) queryForProjects = query.substring(2)
            if (RegExp("^[0-9]{3,6}$").test(queryForProjects)) {
                cmg.requestObjects("PROJECTS_WITH_PROJECT_NUMBER", { PROJECT_NUMBER: queryForProjects }).then(projects => {
                    this.findObjects("projects", query)
                })
            }

            // Request projects from the server for proforma invoice number
            if (RegExp("^pf-[0-9]{7}$").test(query)) {
                const projectID = query.substring(3)
                const project = store.project(projectID)

                if (project) this.findObjects("projectForProforma", query.toUpperCase())
                else
                    cmg.requestObjectWithPK(projectID, "PROJECTS_DETAILS").then(projects => {
                        this.findObjects("projectForProforma", query.toUpperCase())
                    })

                // If the query is in the form of a proforma invoice (PF-ddddddd), don't search for anything else
                return
            }

            // If the query looks like a project number, don't search for anything else
            if (RegExp("^.-[0-9]{6}$").test(query) || RegExp("^[0-9]{6}$").test(query)) return

            // Request employees from the server
            cmg.requestObjects("EMPLOYEES_WITH_NAME", { FULL_NAME: query }).then(employees => {
                this.findObjects("employees", query)
            })

            if (RegExp("^[0-9]{3}-[0-9]{1,6}$").test(query) || RegExp("^[0-9]{1,6}$").test(query)) {
                let queryForInvoices = query
                if (query.includes("-")) queryForInvoices = query.substr(query.indexOf("-") + 1)
                // Request invoices from the server
                cmg.requestObjects("INVOICES_WITH_NUMBER", { INVOICE_NUMBER: queryForInvoices }).then(invoices => {
                    this.findObjects("invoices", query)
                })
            }
        },

        findObjects(objectType, query) {
            if (this.shouldNotSearch) return
            if ((query || "").toLowerCase() != (this.currentQuery || "").toLowerCase()) return

            if (objectType === "projects") this.findProjects(query)
            if (objectType === "invoices") this.findInvoices(query)
            if (objectType === "employees") this.findEmployees(query)
            if (objectType === "projectForProforma") this.findProjectForProformaInvoice(query)

            this.refreshSearchSource()
        },

        onSearchQuery(query) {
            if (query === this.currentQuery) return
            this.shouldNotSearch = false
            this.currentQuery = query
            // Debounce the search for 500 ms, unless the query looks like a project number
            const timeout = RegExp("^.-[0-9]{6}$").test(query) || RegExp("^[0-9]{6}$").test(query) ? 50 : 500
            clearTimeout(this.queryTimeout)
            this.queryTimeout = setTimeout(() => {
                this.doSearch(query.toLowerCase().trim())
                this.findClients(query)
            }, timeout)

            clearTimeout(this.instantQueryTimeout)
            this.instantQueryTimeout = setTimeout(() => {
                query = query.toLowerCase().trim()
                this.findProjects(query)
                // Only search for something else other than projects if the query doesn't look like a project number
                if (!RegExp("^.-[0-9]{6}$").test(query) || !RegExp("^[0-9]{6}$").test(query)) {
                    if (RegExp("^pf-[0-9]{7}$").test(query)) {
                        this.findProjectForProformaInvoice(query)
                    } else {
                        this.findInvoices(query)
                        this.findClients(query)
                        this.findEmployees(query)
                    }
                }

                this.refreshSearchSource()
            }, 100)
        },

        onSearchSelect(result, response) {
            this.shouldNotSearch = true
            clearTimeout(this.queryTimeout)
            clearTimeout(this.instantQueryTimeout)

            if (result.category === "Projects") this.$emit("goToObject", store.project(result.id))
            if (result.category === "Invoices") this.$emit("goToObject", store.invoice(result.id))
            if (result.category === "Employees") this.$emit("goToObject", store.employee(result.id))
            if (result.category === "Clients") this.$emit("goToObject", store.client(result.id))
        },

        onPressReturn() {
            const query = this.currentQuery
            // If the query looks like a project number, don't search for anything else
            if (RegExp("^.-[0-9]{6}$").test(query) || RegExp("^[0-9]{6}$").test(query)) {
                this.findProjects(query)
                if (this.foundProjects && this.foundProjects.length) {
                    this.onSearchSelect(this.foundProjects[0])
                    $("#search-bar").blur()
                    return
                }
            }

            if (this.foundItems && this.foundItems.length) {
                this.onSearchSelect(this.foundItems[0])
                $("#search-bar").blur()
            }
        },

        onFocus() {
            $("#search-bar").select()
        }
    }
}
</script>

<style scoped>
#search-bar {
    border: 0;
    border-radius: 0;
    height: 36px;
    flex: 1 1 auto;
}

#search-bar-wrapper {
    flex: 1 1 auto;
}
</style>

<style>
.search .results {
    width: 700px !important;
}

.ui.category.search > .results .category .results {
    width: 600px !important;
}
</style>
