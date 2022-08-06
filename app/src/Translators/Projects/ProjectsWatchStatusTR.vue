<template lang="pug">
.ui.form
    .field(style="font-size: 12px; color: rgb(136, 51, 51)") This project's progress is monitored by the managers. Please keep your status updated at all times.
    .grouped.fields
        .field
            .ui.radio.checkbox
                input(type="radio" name="watchStatus" @change="clickRadioButton(1)" :checked="translation.WATCH_STATUS === 1")
                label(style="font-size: 12px !important") I am on schedule to deliver on time
        .field
            .ui.radio.checkbox
                input(type="radio" name="watchStatus" @change="clickRadioButton(2)" :checked="translation.WATCH_STATUS === 2")
                label(style="font-size: 12px !important") I am a little behind, but all is OK
        .field
            .ui.radio.checkbox
                input(type="radio" name="watchStatus" @change="clickRadioButton(3)" :checked="translation.WATCH_STATUS === 3")
                label(style="font-size: 12px !important") I expect late delivery. Contact me to find a solution.
</template>

<script>
import cmg from "../ConnectionManagerTR"

export default {
    props: {
        translation: Object
    },

    mounted() {
        $(".ui.checkbox").checkbox()
    },

    methods: {
        clickRadioButton(status) {
            cmg.updateObject(this.translation, "WATCH_STATUS", status)
        }
    }
}
</script>