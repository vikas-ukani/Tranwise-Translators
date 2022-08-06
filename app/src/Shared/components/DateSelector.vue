<template lang="pug">
    .ui.calendar
</template>

<script>
import moment from "moment"

export default {
    props: {
        change: { type: Function, default: () => {} }
    },

    computed: {
        options() {
            let dateType = "datetime"
            if (this.$attrs["date-only"]) dateType = "date"
            if (this.$attrs["month-only"]) dateType = "month"
            const options = {
                type: dateType,
                initialDate: null,
                onChange: (date, text, mode) => {
                    this.change(date.getTime() / 1000)
                }
            }
            return options
        }
    },

    mounted() {
        $(this.$el).calendar(this.options)
    }
}
</script>