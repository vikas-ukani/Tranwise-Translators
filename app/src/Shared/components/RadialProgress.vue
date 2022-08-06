<template lang="pug">
svg(height="20" width="20" class="radial-progress")
    circle(stroke-width="4" stroke="#e6e6e6" fill="none" r="5" cx="10" cy="10")
    circle(stroke-width="4" stroke="#2fa5cc" fill="none" r="5" cx="10" cy="10" stroke-dasharray="31.415" :stroke-dashoffset="dashOffset")
</template>

<script>
export default {
    props: {
        progress: Number
    },

    data() {
        return {
            currentProgress: 5 // the progress being displayed by the animation
        }
    },

    computed: {
        dashOffset() {
            return (31.415 * (100 - this.currentProgress)) / 100
        }
    },

    mounted() {
        // If the component was mounted with progress = 100 it means the file was downloaded earlier,
        // so show full progress right away, without animating it.
        if (this.progress >= 100) {
            this.currentProgress = 100
            return
        }

        // Set an interval that increases the displayed progress gradually until it reaches the real progress,
        // to create an animation for files that are downloaded very fast.
        this.progressInterval = setInterval(() => {
            if (this.currentProgress < this.progress) this.currentProgress += 2
            if (this.currentProgress >= 100) {
                this.currentProgress = 100
                clearInterval(this.progressInterval)
            }
        }, 20)
    }
}
</script>

<style scoped>
.radial-progress {
    transform: rotate(-90deg);
}
</style>