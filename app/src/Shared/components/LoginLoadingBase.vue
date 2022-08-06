<template lang="pug">
.full-height
    .ui.active.inverted.dimmer
        .ui.text.loader {{ message }}
    p
</template>

<script>
export default {
    props: {
        loginItemsReceivedCount: Number,
        loginItemsCount: Number
    },

    data() {
        return {
            message: "Loading..."
        }
    },

    mounted() {
        this.percentDone = 0
        setTimeout(() => {
            this.message = "Loading takes longer than usual. Please reload the page and login again."
        }, 30000)

        const interval = setInterval(() => {
            const factor = 90 / this.loginItemsCount
            this.message = "Loading... " + Math.min(Math.ceil((this.loginItemsReceivedCount || 1) * factor), 99) + " % done"
            if (this.percentDone >= 99) clearInterval(interval)
        }, 100)
    }
}
</script>
