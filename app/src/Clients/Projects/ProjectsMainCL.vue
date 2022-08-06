<template lang="pug">
#projects-wrapper(style="max-width: 700px !important; margin-left: 0 !important")
    .ui.header(v-if="store.didLoadProjects") Projects
    .ui.text.active.loader(v-if="!store.didLoadProjects") Loading projects...
    #projects-list-wrapper(v-else-if="projects.length")
        p Below are all the projects we have in progress for you.
        ProjectsListItem(v-for="project in projects" :project="project" :store="store" :key="project.PK")
        div(style="height: 20px")
    p(v-else) We do not have any projects in progress for you at the moment.
</template>

<script>
import ProjectsListItem from "./ProjectsListItemCL"
import ProjectDetails from "./ProjectDetailsCL"

export default {
    components: {
        ProjectsListItem,
        ProjectDetails
    },

    props: {
        store: Object
    },

    computed: {
        projects() {
            return Object.values(this.store.projects)
        }
    }
}
</script>
