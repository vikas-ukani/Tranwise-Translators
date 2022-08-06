<template lang="pug">
div(style="width: 300px")
    div(style="white-space: pre; padding-bottom: 30px") {{ options.text }}
    .ui.button.coolblue(@click="goToProject") Go to project
</template>

<script>
import store from "../Store/Store"

export default {
    props: {
        options: Object
    },

    methods: {
        goToProject() {
            this.options.closePopup && this.options.closePopup()
            store.goToObject(this.options.project)
        }
    }
}
</script>

