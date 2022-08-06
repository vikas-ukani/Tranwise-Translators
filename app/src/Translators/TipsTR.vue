<template lang="pug">
PageBase(headerText="Tips")
    ListAndDetailsBase(slot="page-contents" :items="tipsList" :selectedObject="tip" :listWidth="400" :listItemHeight="60" )
        //- Filter box
        #list-header(slot="list-header")
            .field.ui.form.small
                input#input-filter-tips(type="text" v-model="tipsFilter" placeholder="Filter tips")
        //- List
        .list-item(slot="list-item" slot-scope="{item}" @click="selectTip(item.PK)" @contextmenu.prevent="contextMenu($event, item)") 
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
                    .post-text {{ tip.DESCRIPTION }}
</template>


<script>
import store from "./Store/StoreTR.js"
import utils from "./UtilsTR.js"

export default {
    data() {
        return {
            pageState: ["tip", "tipsFilter"],
            tip: {},
            tipsFilter: ""
        }
    },

    methods: {
        selectTip(pk) {
            this.tip = store.tip(pk)
        }
    },

    created() {
        this.utils = utils
    },

    computed: {
        tipsList() {
            let tips = []
            let filter = utils.escapeString(this.tipsFilter.toLowerCase())
            tips = store.tips
                .filter(obj => obj && obj.SUBJECT.toLowerCase().match(filter))
                .sort((a, b) => {
                    return b.DATE - a.DATE
                })
            return tips
        }
    }
}
</script>

<style scoped>
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



