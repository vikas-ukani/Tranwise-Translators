<template lang="pug">
#projects-assignment-page-wrapper
    #assignment-wrapper
        ProjectAssignment(:project="project")
    #messages-wrapper
        ProjectMessages(:project="project")
</template>

<script>
import { store, cmg, constants } from "../CoreModules"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import ProjectAssignment from "./Components/ProjectAssignment"
import ProjectMessages from "./Components/ProjectMessages"

export default {
    props: {
        project: Object
    },

    components: {
        ProjectAssignment,
        ProjectMessages
    }
}
</script>

<style scoped>
#projects-assignment-page-wrapper {
    width: 100%;
    height: 100%;
    padding: 0 20px;
    display: grid;
    grid-template-rows: minmax(0, 60%) minmax(0, 40%);
}
</style>
