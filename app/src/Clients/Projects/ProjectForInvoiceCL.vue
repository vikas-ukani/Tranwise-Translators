<template lang="pug">
div
    div.clickable(@click="goToOverview") < Go back to overview
    #projects-wrapper(style="max-width: 700px !important; margin-left: 0 !important")
        ProjectsListItem(:project="projectForInvoice" :store="store")
</template>

<script>
import ProjectsListItem from "./ProjectsListItemCL"

export default {
    components: {
        ProjectsListItem
    },

    props: {
        store: Object,
        projectForInvoice: Object
    },

    methods: {
        goToOverview() {
            this.$emit("changeActivePage", "Welcome")
        }
    }
}
</script>
