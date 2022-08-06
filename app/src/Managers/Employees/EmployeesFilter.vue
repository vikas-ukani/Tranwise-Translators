<template lang="pug">
#employees-filter-wrapper.ui.form.tiny
    #employees-filter-result(v-show="isLoading || result.length > 1")
        div(style="width: 14px; padding-left: 2px")
            .ui.active.inline.mini.loader(v-show="isLoading")
        div(style="padding-left: 10px" v-if="result") {{ result }}
    #employees-filter-filters
        //- Native language
        #employees-filter-native-language.field
            .ui.checkbox#checkbox-native-language
                input#checkbox-native-language-input(type="checkbox" @change="checkboxNativeLanguage($event.target.checked)")
                label.no-select(for="checkbox-native-language-input" style="cursor: pointer;") {{ labelNativeLanguage }}
            TWPopup(popupID="popup-employees-filter-native-language" parentID="employees-filter-native-language" position="top left" :onHide="onHidePopupNativeLanguage")
                .field.ui.form.small(slot="popup-contents" style="width: 250px; margin: 1px")
                    TWDropdown(ref="DropdownNativeLanguage" defaultText="Native language" search upward allowSelectionOfSameValue field="LANGUAGE_ID" :items="store.languages" :change="selectNativeLanguage" itemKey="LANGUAGE")
        //- Language pair
        #employees-filter-language-pair.field
            .ui.checkbox#checkbox-language-pair
                input#checkbox-language-pair-input(type="checkbox" @change="checkboxLanguagePair($event.target.checked)")
                label.no-select(for="checkbox-language-pair-input" style="cursor: pointer;") {{ labelLanguagePair }}
            TWPopup(popupID="popup-employees-filter-language-pair" parentID="employees-filter-language-pair" position="top left" :onHide="onHidePopupLanguagePair")
                .field.ui.form.small(slot="popup-contents" style="width: 250px; margin: 1px")
                    TWDropdown(ref="DropdownSourceLanguage" defaultText="Source language" search upward allowSelectionOfSameValue field="LANGUAGE_ID" :items="store.languages" :change="selectSourceLanguage" itemKey="LANGUAGE")
                    div(style="height: 10px")
                    TWDropdown(ref="DropdownTargetLanguage" defaultText="Target language" search upward allowSelectionOfSameValue field="LANGUAGE_ID" :items="store.languages" :change="selectTargetLanguage" itemKey="LANGUAGE")
        //- Translation area
        #employees-filter-translation-area.field
            .ui.checkbox#checkbox-translation-area
                input#checkbox-translation-area-input(type="checkbox" @change="checkboxTranslationArea($event.target.checked)")
                label.no-select(for="checkbox-translation-area-input" style="cursor: pointer;") {{ labelTranslationArea }}
            TWPopup(popupID="popup-employees-filter-translation-area" parentID="employees-filter-translation-area" position="top left" :onHide="onHidePopupTranslationArea")
                .field.ui.form.small(slot="popup-contents" style="width: 250px; margin: 1px")
                    TWDropdown(ref="DropdownTranslationArea" defaultText="Translation area" search upward showall allowSelectionOfSameValue field="PK" :items="translationAreas" :change="selectTranslationArea" itemKey="AREA")
        //- CAT Tool
        #employees-filter-cat-tool.field
            .ui.checkbox#checkbox-cat-tool
                input#checkbox-cat-tool-input(type="checkbox" @change="checkboxCATTool($event.target.checked)")
                label.no-select(for="checkbox-cat-tool-input" style="cursor: pointer;") {{ labelCATTool }}
            TWPopup(popupID="popup-employees-filter-cat-tools" parentID="employees-filter-cat-tool" position="top left" :onHide="onHidePopupCATTool")
                .field.ui.form.small(slot="popup-contents" style="width: 250px; margin: 1px")
                    TWDropdown(ref="DropdownCATTool" defaultText="CAT tool" search upward showall allowSelectionOfSameValue field="PK" :items="catTools" :change="selectCATTool" itemKey="TOOL")

</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"

export default {
    mixins: [CoreMixin],

    props: {
        isLoading: Boolean,
        result: String,
        filter: Object
    },

    data() {
        return {
            pageState: ["filterNativeLanguage", "filterSourceLanguage", "filterTargetLanguage", "filterTranslationArea", "filterCATTool"],
            filterNativeLanguage: undefined,
            filterSourceLanguage: undefined,
            filterTargetLanguage: undefined,
            filterTranslationArea: undefined,
            filterCATTool: undefined
        }
    },

    created() {
        this.store = store
        this.C_ = C_
    },

    mounted() {
        this.ignoreNextCheckboxEvent = true
        setTimeout(() => {
            this.ignoreNextCheckboxEvent = false
        }, 300)
        if (this.filterNativeLanguage) $("#checkbox-native-language").checkbox("set checked")
        if (this.filterSourceLanguage && this.filterTargetLanguage) $("#checkbox-language-pair").checkbox("set checked")
        if (this.filterTranslationArea) $("#checkbox-translation-area").checkbox("set checked")
        if (this.filterCATTool) $("#checkbox-cat-tool").checkbox("set checked")
    },

    computed: {
        labelNativeLanguage() {
            if (!this.filterNativeLanguage) return "Native language"
            return "Native language: " + this.filterNativeLanguage.LANGUAGE
        },

        labelLanguagePair() {
            if (!this.filterSourceLanguage || !this.filterTargetLanguage) return "Language pair"
            return this.filterSourceLanguage.LANGUAGE + " -> " + this.filterTargetLanguage.LANGUAGE
        },

        labelTranslationArea() {
            if (!this.filterTranslationArea) return "Translation area"
            return "Translation area: " + this.filterTranslationArea
        },

        labelCATTool() {
            if (!this.filterCATTool) return "CAT tool"
            return "CAT tool: " + this.filterCATTool
        },

        translationAreas() {
            return C_.translationAreasList.map((item, index) => ({ PK: index + 1, AREA: item }))
        },

        catTools() {
            return C_.catToolsList.map((item, index) => ({ PK: index + 1, TOOL: item })).filter(tool => tool.TOOL)
        }
    },

    methods: {
        // Native language
        checkboxNativeLanguage(checked) {
            if (this.ignoreNextCheckboxEvent) return
            if (checked) {
                $("#employees-filter-native-language").popup("show")
            } else {
                this.filterNativeLanguage = null
                this.$emit("updateFilter", { nativeLanguageID: null })
                this.$refs.DropdownNativeLanguage.reset()
            }
        },

        selectNativeLanguage(field, value) {
            this.filterNativeLanguage = store.language(value)
            this.$emit("updateFilter", { nativeLanguageID: value })
            $("#employees-filter-native-language").popup("hide")
        },

        onHidePopupNativeLanguage() {},

        // Language pair
        checkboxLanguagePair(checked) {
            if (this.ignoreNextCheckboxEvent) return
            if (checked) {
                $("#employees-filter-language-pair").popup("show")
            } else {
                this.filterSourceLanguage = null
                this.filterTargetLanguage = null
                this.$emit("updateFilter", { sourceLanguageID: null, targetLanguageID: null })
                this.$refs.DropdownSourceLanguage.reset()
                this.$refs.DropdownTargetLanguage.reset()
            }
        },

        selectSourceLanguage(field, value) {
            this.filterSourceLanguage = store.language(value)
            if (this.filterSourceLanguage && this.filterTargetLanguage) {
                this.$emit("updateFilter", { sourceLanguageID: this.filterSourceLanguage.PK, targetLanguageID: this.filterTargetLanguage.PK })
                $("#employees-filter-language-pair").popup("hide")
            }
        },

        selectTargetLanguage(field, value) {
            this.filterTargetLanguage = store.language(value)
            if (this.filterSourceLanguage && this.filterTargetLanguage) {
                this.$emit("updateFilter", { sourceLanguageID: this.filterSourceLanguage.PK, targetLanguageID: this.filterTargetLanguage.PK })
                $("#employees-filter-language-pair").popup("hide")
            }
        },

        onHidePopupLanguagePair() {},

        // Translation area

        selectTranslationArea(field, value) {
            this.filterTranslationArea = C_.translationAreasList[value - 1]
            this.$emit("updateFilter", { translationArea: value })
            $("#employees-filter-translation-area").popup("hide")
        },

        checkboxTranslationArea(checked) {
            if (this.ignoreNextCheckboxEvent) return
            if (checked) {
                setTimeout(() => {
                    $("#employees-filter-translation-area").popup("show")
                }, 50)
            } else {
                this.filterTranslationArea = null
                this.$emit("updateFilter", { translationArea: null })
                this.$refs.DropdownTranslationArea.reset()
            }
        },

        onHidePopupTranslationArea() {},

        // CAT Tool
        selectCATTool(field, value) {
            this.filterCATTool = C_.catToolsList[value - 1]
            this.$emit("updateFilter", { catTool: value })
            $("#employees-filter-cat-tool").popup("hide")
        },

        checkboxCATTool(checked) {
            if (this.ignoreNextCheckboxEvent) return
            if (checked) {
                $("#employees-filter-cat-tool").popup("show")
            } else {
                this.filterCATTool = null
                this.$emit("updateFilter", { catTool: null })
                this.$refs.DropdownCATTool.reset()
            }
        },

        onHidePopupCATTool() {}
    }
}
</script>


<style scoped>
#employees-filter-wrapper {
    border-top: thin solid #aeb3b6;
    border-right: thin solid #aeb3b6;
    background-color: rgb(249, 253, 253);
}

#employees-filter-filters {
    padding: 8px 5px 5px 5px;
}

#employees-filter-result {
    display: flex;
    padding: 5px;
    background-color: rgb(221, 232, 235);
}

label {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    cursor: pointer;
    font-size: 12.5px !important;
}
</style>
