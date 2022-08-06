<template lang="pug">
    .ui.checkbox(:class="{ checked: checkedValue, disabled: disabled || readonly }" )
        input(type="checkbox" :id="'checkbox-' + field" @change="change(field, $event.target.checked ? 1 : 0)" :checked="checkedValue"  :disabled="disabled")
        label(:for="'checkbox-' + field" style="cursor: pointer; font-size: 12.5px !important;" :class="{'checkbox-label-readonly' : readonly}") {{ label }}
</template>

<script>
export default {
    props: {
        obj: { type: Object, default: () => {} },
        field: String,
        label: String,
        disabled: Boolean,
        readonly: Boolean,
        change: { type: Function, default: () => {} }
    },

    mounted() {
        $(this.$el).checkbox()
    },

    created() {
        // If the "checked" attribute is set on the component, it should start as checked
        // - hasCheckedAttribute is used in the computed checkedValue()
        if (this.$attrs.checked) this.hasCheckedAttribute = true
    },

    methods: {
        isChecked() {
            return $(this.$el).hasClass("checked")
        },

        setChecked(value) {
            if (value === undefined || value === true) $(this.$el).checkbox("set checked")
            if (value === false) $(this.$el).checkbox("set unchecked")
        }
    },

    computed: {
        checkedValue() {
            // If the "checked" attribute was set on the component, return true and set hasCheckedAttribute to false,
            // so the next time checkedValue() is calculated, will skip this step. This is used for checkboxes that should start as checked.
            if (this.hasCheckedAttribute) {
                this.hasCheckedAttribute = false
                return true
            }
            if (this.$attrs.value !== undefined) return this.$attrs.value
            else return this.obj ? this.obj[this.field] : false
        }
    }
}
</script>

<style scoped>
.ui.checkbox.toggle.disabled > label {
    opacity: 1 !important;
}

.checkbox-label-readonly {
    opacity: 1 !important;
}
</style>


