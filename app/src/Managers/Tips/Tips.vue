<template lang="pug">
PageBase(headerText="Tips" headerWidth="418")
    //- Header buttons
    #header-buttons-wrapper(slot="header-buttons")
        .ui.button.primary(@click="addTip" style="margin-right: 20px") Add new tip
        .ui.button.teal(v-show="tip.PK" @click="editTip" style="margin-right: 20px") Edit tip
        .ui.button.purple(v-show="tip.PK" @click="deleteTip") Delete tip
    ListAndDetailsBase(slot="page-contents" :items="tipsList" :selectedObject="tip" :listWidth="400" :listItemHeight="60" )
        //- Filter box
        #list-header(slot="list-header")
            .field.ui.form.small
                input#input-filter-tips(type="text" v-model="tipsFilter" placeholder="Filter tips")
        //- List
        .list-item(slot="list-item" slot-scope="{item}" @click="selectTip(item.PK)") 
            .list-row1 {{ item.SUBJECT }}
            .list-row2
                .list-row2-sticky
                .list-row2-description {{ item.DESCRIPTION }}
                .list-row2-separator
                .list-row2-date {{ utils.formatDate(item.DATE, "ll") }}               
        //- Details div
        #details-wrapper(slot="details" style="max-width: 750px")
            #posts-wrapper.ui.segment.raised(v-if="tip.PK")
                #thread-title {{ tip.SUBJECT }}
                #posts-list-wrapper
                    .post-text(v-html="utils.linkify(tip.DESCRIPTION.replace(/<img.+>/gi, ''))")
    //- Extra components (modal dialogs, context menus etc.)
    .div-zero(slot="page-extras")
        //- MODAL Add a new tip
        #modal-add-tip.ui.small.modal
            .header Add a new tip
            i.close.icon
            .content
                .ui.form
                    .field
                        input(type="text" v-model="newTip.subject" placeholder="Subject")
                    .field
                        textarea(rows="6" v-model="newTip.description" placeholder="Text")
            .actions
                .ui.cancel.button Cancel
                #modal-create-thread-button.ui.positive.button.transition(@click="doAddTip") Add tip
        //- MODAL Add a new tip
        #modal-edit-tip.ui.small.modal
            .header Edit this tip
            i.close.icon
            .content
                .ui.form
                    .field
                        input(type="text" v-model="tipForEdit.subject" placeholder="Subject")
                    .field
                        textarea(rows="6" v-model="tipForEdit.description" placeholder="Text")
            .actions
                .ui.cancel.button Cancel
                #modal-create-thread-button.ui.positive.button.transition(@click="doEditTip") Save changes
</template>

<script>
import store from "../Store/Store.js"
import cmg from "../ConnectionManager.js"
import utils from "../Utils.js"
import CoreMixin from "../../Shared/Mixins/CoreMixin"

export default {
    mixins: [CoreMixin],

    props: {
        isForTranslations: Boolean
    },

    data() {
        return {
            pageState: ["tip", "tipsFilter"],
            tip: {},
            tipsFilter: "",
            newTip: { subject: "", text: "" },
            tipForEdit: { subject: "", text: "" }
        }
    },

    methods: {
        selectTip(pk) {
            this.tip = store.tipsManager(pk)
        },

        async deleteTip() {
            if (await this.$dialogCheck(`Are you sure you want to delete this tip? The operation can not be undone.`)) {
                cmg.deleteObject(this.tip)
                this.tip = {}
            }
        },

        editTip() {
            this.tipForEdit.subject = this.tip.SUBJECT
            this.tipForEdit.description = this.tip.DESCRIPTION

            this.showModal("#modal-edit-tip")
        },

        addTip() {
            this.newTip.subject = ""
            this.newTip.description = ""
            this.showModal("#modal-add-tip")
        },

        doAddTip() {
            if (!this.newTip.subject) return
            const tip = {
                table: "TIPS_MANAGERS",
                SUBJECT: this.newTip.subject,
                DESCRIPTION: this.newTip.description,
                CATEGORY: 1
            }

            cmg.insertObject(tip).then(insertedTip => {
                this.tip = store.tipsManager(insertedTip.PK)
            })
        },

        doEditTip() {
            cmg.updateObject(this.tip, "SUBJECT", this.tipForEdit.subject)
            cmg.updateObject(this.tip, "DESCRIPTION", this.tipForEdit.description)
        }
    },

    created() {
        this.utils = utils
    },

    computed: {
        tipsList() {
            let tips = []
            let filter = utils.escapeString(this.tipsFilter.toLowerCase())

            tips = store.tipsManagers
                .filter(obj => obj && obj.PK && obj.SUBJECT.toLowerCase().match(filter))
                .sort((a, b) => {
                    return b.DATE - a.DATE
                })
            return tips
        }
    }
}
</script>

<style scoped>
#header-buttons-wrapper {
    padding: 10px;
    padding-right: 22px;
}

.list-item {
    border-bottom: 1px solid rgb(224, 224, 224);
    height: 60px;
}

#input-filter-tips {
    border-radius: 0;
    border: 0;
    border-bottom: 1px solid #cad0d3;
    border-top: 1px solid #cad0d3;
    border-right: solid 1px #cad0d3;
    margin-bottom: 1px;
}

.list-row1 {
    font-weight: 400;
    padding-left: 13px;
    padding-top: 10px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.list-row2 {
    display: grid;
    grid-template-columns: 20px auto 1fr auto;
    font-weight: 200;
}

.list-row2-sticky {
    padding: 4px 0 0 6px;
    color: rgba(19, 82, 33, 0.555);
}

.list-row2-description {
    color: rgb(153, 157, 163);
    padding: 3px 0 3px 3px;
    font-size: 12px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    width: 250px;
}

.list-row2-date {
    color: rgb(132, 162, 179);
    padding: 3px 20px 3px 4px;
    font-size: 12px;
}

.list-row2-author {
    color: rgb(139, 141, 143);
    padding: 3px 0 3px 3px;
    font-size: 12px;
}

#details-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
}

#posts-wrapper {
    padding: 0;
    border-radius: 5px;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    height: 100%;
}

#thread-title {
    font-size: 20px;
    font-weight: 300;
    color: white;
    padding: 20px;
    background-color: #7ac859;
    border-radius: 5px 5px 0 0;
    line-height: 1.4em;
}
#posts-list-wrapper {
    flex: 1 1 auto;
    overflow-y: auto;
    background-color: white;
    border-radius: 0 0 5px 5px;
    height: 0;
}

#thread-posts {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow-y: auto;
}

#posts-contents {
    overflow: auto;
}

.post-wrapper {
    border-bottom: 1px solid rgb(224, 224, 224);
    padding: 15px;
}

.post-wrapper:nth-of-type(2n) {
    background-color: rgb(248, 252, 255);
}

.post-header {
    display: grid;
    grid-template-columns: auto 1fr auto;
}

.post-header-author {
    font-weight: 700;
    color: rgb(78, 77, 77);
}

.post-header-date {
    color: rgb(77, 78, 80);
}

.post-text {
    padding: 20px;
    white-space: pre-line;
    color: rgb(112, 114, 117);
    line-height: 1.6em;
}
</style>



