<template lang="pug">
    div
        table.ui.celled.table(v-if="files.length")
            tbody
                tr(v-for="f, index in files")
                    td.collapsing.clickable.unselectable(style="text-align: center; width: 130px" :style="{'background-color':fileTypeColors[f.fileType]}" @click="cycleFileType(f)")
                        div(style="display: flex") 
                            div(style="flex-grow: 1; text-align: center") {{ C_.projectFilesStringTypes[f.fileType] }}
                            i.caret.down.icon(style="margin-right: -5px !important")
                    td {{ f.name }}
                    td.collapsing(@click="deleteFile(index)")
                        i.icon.delete.red.clickable
        .ui.horizontal.segments(style="min-height: 0; background-color: #f9f9f9")
            UploaderSegment(v-for="fileDropType in fileDropTypes" :fileType="fileDropType.fileType" :key="fileDropType.fileType" :fileTypeName="fileDropType.typeName" :dropFile="dropFile")
        p.small(style="color: grey") * Drop files in the sections above to add them to the project or click a section to browse and upload files of that type    
        p.small(style="color: grey") * Delete a file if you don't want to add it to the project or click on the file type to change it    
</template>

<script>
import C_ from "../../Constants"
import UploaderSegment from "../../../Shared/components/FileUploaderSegment"

export default {
    props: {
        files: Array
    },

    components: { UploaderSegment },

    created() {
        this.fileTypeColors = [
            "#FFFFFF",
            "#D1CCFD",
            "#B5ECF2",
            "#C6ECA4",
            "#FFFABB",
            "#F0D7B7",
            "#D1CCFD",
            "#B5ECF2",
            "#C6ECA4",
            "#FFFABB",
            "#F0D7B7",
            "#CECECE",
            "#CECECE",
            "#CECECE",
            "#CECECE",
            "#CECECE"
        ]

        this.fileDropTypes = [
            { fileType: C_.pfMain, typeName: "MAIN" },
            { fileType: C_.pfReference, typeName: "REFERENCE" },
            { fileType: C_.pfCATMemory, typeName: "MEMORY" },
            { fileType: C_.pfCATAnalysis, typeName: "ANALYSIS" },
            { fileType: C_.pfClientPO, typeName: "PO" }
        ]

        this.C_ = C_
    },

    methods: {
        dropFile(fileType, files) {
            for (let i = 0, file; (file = files[i]); i++) {
                this.files.push({
                    fileType: fileType,
                    name: file.name,
                    selectedFile: file
                })
            }
        },

        deleteFile(index) {
            this.files.splice(index, 1)
        },

        fileBackgroundClassName(fileType) {
            let classObject = {}
            classObject[`file-${fileType}`] = true
            return classObject
        },

        cycleFileType(file) {
            let newType
            if (file.fileType === C_.pfMain) newType = C_.pfReference
            if (file.fileType === C_.pfReference) newType = C_.pfCATMemory
            if (file.fileType === C_.pfCATMemory) newType = C_.pfCATAnalysis
            if (file.fileType === C_.pfCATAnalysis) newType = C_.pfClientPO
            if (file.fileType === C_.pfClientPO) newType = C_.pfMain
            if (newType) file.fileType = newType
        }
    }
}
</script>

<style scoped>
.file-MAIN {
    background-color: #ffe4d6;
}

.file-REFERENCE {
    background-color: #f9ffdb;
}

.file-TRANSLATE {
    background-color: #2bd8ff;
}

.file-PROOFREAD {
    background-color: #68f9a5;
}
</style>
