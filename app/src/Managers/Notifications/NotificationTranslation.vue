<template lang="pug">
div(style="width: 300px")
    #notification-title(v-if="options.title") {{ options.title }}
    #notification-message(v-if="options.text") {{ options.text }}
    #notification-buttons
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

<style scoped>
#notification-title {
    font-weight: 600;
    padding-bottom: 20px;
    white-space: pre;
}

#notification-message {
    font-size: 12px;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 10px;
    padding-bottom: 20px;
    overflow-wrap: break-word;
    white-space: pre;
}

#notification-message::-webkit-scrollbar {
    width: 3px;
}

#notification-buttons {
    text-align: center;
    padding: 10px;
}
</style>