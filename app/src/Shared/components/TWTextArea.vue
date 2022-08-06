<template lang="pug">
    textarea(ref="textarea" :readonly="readonly" :placeholder="placeholder" :rows="rows" :class="shouldHighlightMandatory && 'mandatory-error'" :value="$props.value ? $props.value : (obj ? obj[field] : '')" @change="change($props.field, $event.target.value)" @keydown="keydown" @paste="paste")
</template>

<script>
export default {
    props: {
        readonly: Boolean,
        rows: Number,
        placeholder: { type: String, default: "" },
        obj: { type: Object, default: () => {} },
        field: { type: String, default: "" },
        value: String,
        change: { type: Function, default: () => {} }
    },

    data() {
        return {
            shouldHighlightMandatory: false
        }
    },

    methods: {
        keydown() {
            this.shouldHighlightMandatory = false
        },

        paste() {
            this.shouldHighlightMandatory = false
        },

        highlightMandatory(param) {
            if (!this.$attrs.mandatory) return false
            if (this.$refs.textarea.value.length > 0) return false
            this.shouldHighlightMandatory = param === undefined || param === true
            return this.shouldHighlightMandatory
        }
    }
}
</script>

<style scoped>
.mandatory-error {
    background-color: rgb(253, 246, 244) !important;
    border-color: rgb(231, 122, 122) !important;
}
</style>



