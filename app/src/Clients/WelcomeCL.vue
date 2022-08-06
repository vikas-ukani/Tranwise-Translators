<template lang="pug">
.ui.main.text.container(style="max-width: 700px !important; margin-left: 0 !important")
    h3.ui.dividing.header(v-if="quotesMessage") Important message about your quotes
    .field(v-if="quotesMessage" @click="goToQuotes" style="cursor: pointer; color: rgb(202, 103, 57)") {{ quotesMessage }}
    h3.ui.dividing.header(v-if="projects.length") Important information about your projects
    .ui.large.form(v-for="project in projects")
        .fields
            .field(style="font-weight: 700") Project {{ project.NUMBER }}
            .field(style="flex-grow: 1")
            .field.clickable(@click="goToProject(project)") Go to project details
        .field(style="padding-bottom: 30px")
            img(:src="projectStatusImage(project)" style="max-width: 700px")
    h3.ui.dividing.header(v-if="unpaidServicesMessage") Important information about your invoices
    .field(v-if="unpaidServicesMessage" style="cursor: pointer; white-space: pre-wrap") {{ unpaidServicesMessage }}
    h1.ui.header(v-if="!quotesMessage && !unpaidServicesMessage && !projects.length") Welcome!
    p(v-if="!quotesMessage && !unpaidServicesMessage && !projects.length") We have created this portal for you so you can view the status of all the projects we have in progress for you, the pending quotes and our invoices for completed projects. Choose one of the options above.
    p(v-if="completedProjects.length" style="padding-top: 20px") Below is a list of the projects that we have completed for you.
    .ui.large.form
        .fields.project-overview-wrapper(v-for="project of completedProjects" @click="showProjectDetails(project)")
            .field.clickable(style="padding-right: 40px") {{ project.NUMBER }}
            .field(style="flex-grow: 1")
            .field(v-if="project.isLoading && !project.isLoaded") Loading project...
            .field.clickable(v-else) Go to project's details
</template>

<script>
import utils from "./UtilsCL"

export default {
    props: {
        store: Object
    },

    created() {
        this.utils = utils
    },

    computed: {
        quotesMessage() {
            const pendingQuotes = Object.values(this.store.quotes).filter(quote => !quote.isAccepted && !quote.isCancelled).length
            if (pendingQuotes) return `We have ${pendingQuotes} quote${utils.pluralS(pendingQuotes)} awaiting your payment. Click here to review them.`
        },

        unpaidServicesMessage() {
            let result = ""
            for (let project of Object.values(this.store.projects)) {
                if (!project.services) continue
                for (let service of project.services) result += `${project.NUMBER}   -   ${service}\n`
            }
            if (result) result = `The following additional services have not been paid for yet:\n\n` + result
            return result
        },

        projects() {
            return Object.values(this.store.projects)
        },

        completedProjects() {
            return Object.values(this.store.completedProjects)
        }
    },

    methods: {
        goToQuotes() {
            this.$emit("changeActivePage", "QuotesMain")
        },

        goToInvoices() {
            this.$emit("changeActivePage", "InvoicesMain")
        },

        goToProject(project) {
            this.$emit("changeActivePage", "ProjectsMain")
        },

        showProjectDetails(projectToShow) {
            this.$set(projectToShow, "isLoading", true)

            if (projectToShow.isLoaded) {
                for (let project of Object.values(this.store.projects))
                    if (project.PK === projectToShow.PK) {
                        this.$emit("showProjectDetails", project)
                        return
                    }
            }

            axios(this.store.apiURL + "Projects?c=" + this.store.code + "&p=" + projectToShow.PK).then(response => {
                if (response.data) {
                    const project = response.data[0]
                    if (!project) return
                    this.$emit("showProjectDetails", project)
                    this.$set(projectToShow, "isLoaded", true)
                }
            })
        },

        projectStatusImage(project) {
            const prefix = window.location.href.includes("localhost") ? "" : "/Clients"
            return prefix + `/static/icons/ProjectStatus/ProjectStatus-${project.STATUS}.png`
        }
    }
}
</script>

<style scoped>
h3.ui.header {
    color: #1ea8c1 !important;
    border-color: #1ea8c1 !important;
    border-width: 2px;
}

.project-overview-wrapper {
    border: thin solid #1ea8c1;
    border-radius: 3px;
    padding: 10px;
}
</style>
