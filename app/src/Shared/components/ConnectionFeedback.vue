<template lang="pug">
.ui.dimmer#connection-feedback-dimmer(style="z-index: 10000000000")
    div(v-if="shouldShowReloadButton") 
        .ui.text(style="color: white; padding-bottom: 40px") Tranwise could not establish a connection to the server. Please reload the page.
        .ui.button(@click="reloadPage") Reload page
    .ui(v-else style="color: white") Reconnecting to the server...
</template>

<script>
export default {
    data() {
        return {
            shouldShowReloadButton: false
        }
    },

    mounted() {
        $("#connection-feedback-dimmer").dimmer({ closable: false })
    },

    methods: {
        showReconnectionFeedback() {
            $("#connection-feedback-dimmer").dimmer("show")
        },

        hideReconnectionFeedback() {
            $("#connection-feedback-dimmer").dimmer("hide")
        },

        showReloadButton() {
            window.onbeforeunload = null
            this.shouldShowReloadButton = true
            $("#connection-feedback-dimmer").dimmer("show")
        },

        reloadPage() {
            location.reload()
        }
    }
}
</script>
