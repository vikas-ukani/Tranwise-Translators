<template lang="pug">
.editable-div-main-wrapper
    .editable-div-wrapper
        div(style="padding-bottom: 7px") {{ title }}:
            i.edit.icon(style="margin-left: 20px; color: lightgrey;" @click="isInEditMode = !isInEditMode")
        .editable-div-value(v-if="!isInEditMode") {{ $props.value ? $props.value : (obj ? obj[field] : '') }}
        textarea.editable-div-textarea(v-if="isInEditMode" style="height: 85%;" ref="textarea" :readonly="readonly" :placeholder="placeholder" :rows="rows" :value="$props.value ? $props.value : (obj ? obj[field] : '')" @change="change($props.field, $event.target.value)")
</template>

<script>
export default {
    props: {
        title: String,
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
            isInEditMode: false
        }
    }
}
</script>

<style scoped>
.editable-div-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.editable-div-value {
    font-size: 12px;
    height: 100%;
    overflow: auto;
    overflow-wrap: break-word;
    flex: 1 1;
    padding-right: 10px;
    white-space: pre-wrap;
}

.editable-div-value::-webkit-scrollbar {
    width: 3px;
}

.editable-div-textarea::-webkit-scrollbar {
    width: 6px;
}

.editable-div-main-wrapper {
    height: 100%;
    overflow: hidden;
}
</style>
