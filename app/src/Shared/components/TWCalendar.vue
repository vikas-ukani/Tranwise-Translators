<template lang="pug">
    .ui.calendar
        .ui.input.left.icon
            i.calendar.alternate.outline.icon
            input(:disabled="$attrs.disabled" ref="input" type="text" :class="shouldHighlightMandatory && 'mandatory-error'" @blur="setSelectedValue" :placeholder="placeholder" style="width: 190px; text-align: right")
</template>

<script>
import moment from "moment"

export default {
    props: {
        obj: { type: Object, default: () => {} },
        placeholder: { type: String, default: "" },
        field: String,
        change: { type: Function, default: () => {} }
    },

    data() {
        return {
            shouldHighlightMandatory: false
        }
    },

    computed: {
        options() {
            const vm = this
            const isDateOnly = this.$attrs["date-only"]
            const options = {
                type: isDateOnly ? "date" : "datetime",
                initialDate: undefined,
                formatter: {
                    datetime: function(datetime, settings) {
                        let momentDate = moment(datetime)
                        let format = isDateOnly ? "D MMM YYYY" : "D MMM YYYY   HH:mm"
                        return momentDate.format(format)
                    }
                },
                ampm: false,
                onHide() {
                    vm.$refs.input.blur()
                }
            }

            if (this.$attrs.forceToBottom)
                options.popupOptions = {
                    position: "bottom left",
                    lastResort: "bottom left",
                    prefer: "opposite",
                    hideOnScroll: false
                }
            return options
        }
    },

    methods: {
        setSelectedValue() {
            if (this.$refs.input.value === "") {
                this.change(this.field, 0)
                setTimeout(() => {
                    this.$refs.input.value = ""
                }, 50)
                return
            }

            const date = $(this.$el).calendar("get date")
            if (date) {
                // This ensures that the timestamp is converted and displayed in the server time, not the local time
                const deltaFromServer = new Date(date).getTimezoneOffset() * 60
                const timestamp = date.getTime() / 1000
                // For some reason, in rare occasions, the timestamp is something like 6312756556800 or smaller than 0. Prevent the change is such cases.
                if (timestamp < 2000000000 && timestamp >= 0) {
                    this.change(this.field, timestamp - deltaFromServer)
                    this.shouldHighlightMandatory = false
                }
            }
        },

        setDate(timestamp) {
            if (this.lastSetTimestamp == timestamp && timestamp != undefined) return
            this.lastSetTimestamp = timestamp

            if (timestamp) {
                // This ensures that the timestamp is converted and displayed in the server time, not the local time
                const deltaFromServer = new Date(timestamp * 1000).getTimezoneOffset() * 60
                const date = new Date((timestamp + deltaFromServer) * 1000)
                $(this.$el).calendar("set date", date, true, false)
            } else {
                this.$refs.input.value = ""
            }
        },

        initialize() {
            $(this.$el).calendar(this.options)
            this.setDate()
        },

        clearDate() {
            $(this.$el).calendar("set date", undefined, true, false)
        },

        highlightMandatory(param) {
            if (!this.$attrs.mandatory) return false
            if (this.$attrs.disabled) return false
            const date = $(this.$el).calendar("get date")
            if (date) return false

            this.shouldHighlightMandatory = param === undefined || param === true
            return this.shouldHighlightMandatory
        }
    },

    mounted() {
        $(this.$el).calendar(this.options)
        this.setDate(this.obj[this.field])
    },

    watch: {
        obj: function(newObj, oldObj) {
            this.setDate(this.obj[this.field])
        }
    }
}
</script>

<style>
.mandatory-error {
    background-color: rgb(253, 246, 244) !important;
    border-color: rgb(231, 122, 122) !important;
}
</style>
