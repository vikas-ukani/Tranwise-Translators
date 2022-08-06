<template lang="pug">
.ui.segment.center.aligned
    .file-drop-area(:class=" { hover: isHovering }"
    :style="{ 'background-color': colors[fileType] }" 
    @dragover.stop.prevent="isHovering = true"
    @dragleave.prevent="isHovering = false"
    @drop.prevent="drop"
    @click="selectFilesForUpload") {{ fileTypeName }}
    input(type="file" :ref="inputFileID" multiple style="display: none" @change="processBrowseFiles")
</template>

<script>
export default {
    props: {
        fileType: Number,
        fileTypeName: String,
        colors: { type: Array, default: () => [] },
        dropFile: { type: Function, default: () => {} }
    },

    data() {
        return {
            isHovering: false
        }
    },

    computed: {
        inputFileID() {
            return "upload-input-" + this.fileType
        }
    },

    methods: {
        selectFilesForUpload() {
            $(this.$refs[this.inputFileID]).click()
        },

        processBrowseFiles(event) {
            const files = [...event.srcElement.files]
            this.dropFile(this.fileType, files)

            // Clear the input, so it's ready for the next upload
            $(this.$refs[this.inputFileID]).val("")
        },

        drop(event) {
            this.isHovering = false
            this.dropFile(this.fileType, event.dataTransfer.files)
        }
    }
}
</script>

<style scoped>
.file-drop-area {
    border: 1px dashed rgb(196, 194, 194);
    border-radius: 1px;
    box-shadow: inset 0px 0px 10px -1px rgba(0, 0, 150, 0.08);
    height: 35px;
    line-height: 35px;
    margin: auto;
    text-align: center;
    text-transform: uppercase;
    font-weight: 400;
    font-size: 11px;
    cursor: pointer;
}

.hover {
    box-shadow: inset 0px 0px 10px -1px rgba(0, 0, 150, 0.7);
}

.ui.segment.center.aligned {
    padding: 2px;
}
</style>

