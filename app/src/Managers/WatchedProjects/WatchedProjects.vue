<template lang="pug">
PageBase(headerText="Projects under watch")
    #table-wrapper(slot="page-contents")
        ScrollableTable()
            thead(slot="thead")
                th.two.wide Project
                th.two.wide Language
                th.twelve.wide Translator
            tbody(slot="tbody" v-if="watchedTranslations.length")
                tr(v-for="translation in watchedTranslations")
                    td.two.wide(v-if="translation.PK") {{ translation.subproject().project().PROJECT_NUMBER }}
                        i.icon.external.alternate.small.icon-go-to-project(@click="goToProject(translation.subproject().project())")
                    td.two.wide(v-if="translation.PK") {{ translation.subproject().languageName() }}
                    td.twelve.wide(v-if="translation.PK" @contextmenu.prevent="contextMenu($event, translation)")
                        div(style="display: inline-block")
                            img(:src="'/static/icons/Projects/Watched/ProjectsWatchedStatus' + translation.WATCH_STATUS + '.svg'" style="width: 13px")
                        span &nbsp;&nbsp; {{ translation.translationSymbol() }} &nbsp;&nbsp;&nbsp; {{ translation.employee().fullName() }}
                    td.sixteen.wide(v-if="!translation.PK")
            tbody(slot="tbody" v-else)
                tr
                    td.sixteen.wide There are no projects being watched
            tfoot(slot="tfoot")
                tr
                    th(colspan="3")
                        div(style="display: flex; padding: 3px")
                            img(src="/static/icons/Projects/Watched/ProjectsWatchedStatus1.svg" style="width: 13px")
                            div(style="padding-left: 10px") =&nbsp;&nbsp;I am on schedule to deliver on time
                        div(style="display: flex; padding: 3px")
                            img(src="/static/icons/Projects/Watched/ProjectsWatchedStatus2.svg" style="width: 13px")
                            div(style="padding-left: 10px") =&nbsp;&nbsp;I am a little behind, but all is OK
                        div(style="display: flex; padding: 3px")
                            img(src="/static/icons/Projects/Watched/ProjectsWatchedStatus3.svg" style="width: 13px")
                            div(style="padding-left: 10px") =&nbsp;&nbsp;I am having problems and could expect late delivery. Contact me to find a solution.
    .div-zero(slot="page-extras")
        //- MENU List context menu
        TWContextMenu(ref="listContextMenu")
            .menu(slot="menu-items")
                .item(@click="chat") Chat with translator
                .item(@click="sendMessage") Send message to translator
                .item(@click="requestStatusUpdate") Request status update

</template>

<script>
import { store, cmg, constants, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import ScrollableTable from "../../Shared/components/ScrollableTable"

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    components: { ScrollableTable },

    data() {
        return {
            translationForContextMenu: undefined
        }
    },

    computed: {
        // The translations that are assigned (ie. psTranslating or psProofreading) for projects that
        // are in progress and have IS_PROGRESS_WATCHED set to true
        watchedTranslations() {
            // Get the PKs of all the watched projects, so we can search their subprojects below
            const watchedProjectsPKs = []
            for (let project of store.projects) if (project.IS_PROGRESS_WATCHED && project.isInProgress()) watchedProjectsPKs.push(project.PK)

            // Get the PKs of all the subprojects of watched projects, so we can search their assigned translations below
            const watchedSubprojectsPKs = []
            for (let subproject of store.subprojects) if (subproject.PK && watchedProjectsPKs.includes(subproject.PROJECT_ID)) watchedSubprojectsPKs.push(subproject.PK)

            // Get all the translations for watched projects
            const translations = store.translations.filter(
                translation => translation.PK && translation.isAssigned() && translation.employee() && watchedSubprojectsPKs.includes(translation.SUBPROJECT_ID)
            )

            // Sort the translation by project, subproject and translation status
            translations.sort((a, b) => {
                let aProject = a.subproject().project()
                let bProject = b.subproject().project()
                if (aProject === bProject) {
                    if (a.subproject() === b.subproject()) return a.STATUS - b.STATUS
                    else return a.subproject().PK - b.subproject().PK
                } else return aProject.PK - bProject.PK
            })

            if (translations.length) {
                // Add a blank line between projects
                let lastProjectPK = translations[0].subproject().project().PK
                let i = 0
                while (i < translations.length) {
                    const translation = translations[i]
                    if (translation.subproject().project().PK != lastProjectPK) {
                        // Insert a dummy translation after each project, to have a blank line between projects
                        translations.splice(i, 0, {})
                        lastProjectPK = translation.subproject().project().PK
                    }
                    i++
                }
            }

            return translations
        }
    },

    methods: {
        contextMenu(event, item) {
            this.translationForContextMenu = item
            this.$refs.listContextMenu.show(event)
            if (window.getSelection) window.getSelection().removeAllRanges()
        },

        goToProject(project) {
            this.$emit("goToObject", project)
        },

        chat() {
            const employee = store.employee(this.translationForContextMenu.EMPLOYEE_ID)
            store.chatWithEmployee(employee)
        },

        sendMessage() {
            const employee = store.employee(this.translationForContextMenu.EMPLOYEE_ID)
            store.composeAndSendEmployeeMessage(employee)
        },

        requestStatusUpdate() {
            const employee = store.employee(this.translationForContextMenu.EMPLOYEE_ID)
            const project = this.translationForContextMenu.subproject().project()
            const message = `Dear ${employee.FIRST_NAME},\n\nPlease update your status for project ${project.PROJECT_NUMBER} on the project's details page in Tranwise.\n\nThank you!`
            store.composeAndSendEmployeeMessage(employee, message)
        }
    }
}
</script>

<style scoped>
#table-wrapper {
    padding: 15px;
    flex-grow: 1;
}

.icon-go-to-project {
    padding-left: 10px;
    cursor: pointer;
    color: rgb(200, 207, 214);
}
</style>