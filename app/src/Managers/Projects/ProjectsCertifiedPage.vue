<template lang="pug">
#projects-certified-page-wrapper
    #files-wrapper.ui.form
        ProjectFiles(:project="project" screen="Deliveries")
    #messages-wrapper 
        ProjectMessages(:project="project")
</template>

<script>
import { store, cmg, constants } from "../CoreModules"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import ProjectFiles from "./Components/ProjectFiles"
import ProjectMessages from "./Components/ProjectMessages"

export default {
    props: {
        project: Object
    },

    components: {
        ProjectFiles,
        ProjectMessages
    },

    computed: {},

    methods: {}
}
</script>

<style scoped>
#projects-certified-page-wrapper {
    width: 100%;
    height: 100%;
    padding: 0 20px;
    display: grid;
    grid-template-rows: minmax(0, 60%) minmax(0, 40%);
}

#files-wrapper {
    height: 100%;
}

#messages-wrapper {
    width: 100%;
    height: 100%;
}
</style>