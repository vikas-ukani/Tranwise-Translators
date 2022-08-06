<template lang="pug">
#projects-files-page-wrapper
    .ui.form#projects-files-contents-wrapper
        #files-wrapper
            ProjectFiles(:project="project" hideFilter :fileTypes="[1, 6, 11, 12, 13, 14, 15]" screen="Files")
        #cat-tools-wrapper
            ProjectCATTools(:project="project")
</template>

<script>
import { store, cmg, constants } from "../CoreModules"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import ProjectFiles from "./Components/ProjectFiles"
import ProjectCATTools from "./Components/ProjectCATTools"

export default {
    props: {
        project: Object
    },

    components: {
        ProjectFiles,
        ProjectCATTools
    },

    computed: {}
}
</script>

<style scoped>
#projects-files-page-wrapper {
    padding: 0 20px;
    width: 100%;
    height: 100%;
}
#projects-files-contents-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

#files-wrapper {
    flex: 1 1 auto;
}

#cat-tools-wrapper {
    margin-top: 10px;
}
</style>
