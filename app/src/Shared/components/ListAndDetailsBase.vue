<template lang="pug">
    #list-and-details-contents
        #list-and-details-container(:style="{ 'flex-basis': listWidth + 'px', 'min-width': listWidth + 'px' }")
            .list-header
                slot(name="list-header")
            #list-wrapper
                RecycleScroller.scroller(ref="scroller", :items="items", :item-size="listItemHeight" key-field="PK")
                    .list-item-container(slot-scope="{item}", :class="{'list-item-selected': selectedObject.PK == item.PK}" :style="{ height: listItemHeight + 'px' }")
                        slot(name="list-item", :item="item")
            .list-footer
                slot(name="list-footer")
        #details-container
            slot(name="details")
</template>

<script>
import { RecycleScroller } from "vue-virtual-scroller"
import "vue-virtual-scroller/dist/vue-virtual-scroller.css"

export default {
    props: {
        headerText: String,
        listItemHeight: Number,
        listWidth: Number,
        items: Array,
        item: Object,
        selectedObject: Object
    },

    components: {
        RecycleScroller
    },

    methods: {
        scrollToItemWithPK(pk) {
            let count = 0
            for (let item of this.items) {
                if (item.PK == pk) break
                count++
            }
            this.$refs.scroller.scrollToItem(count - 5)
        }
    }
}
</script>

<style scoped>
#list-and-details-contents {
    height: 100%;
    display: flex;
    flex-direction: row;
}

#list-and-details-container {
    display: flex;
    flex-direction: column;
    height: 100%;
}

#list-wrapper {
    flex: 1 1;
    overflow-y: auto;
    background-color: white;
    border-right: solid 1px #bfc2c4;
    height: 0;
}

.list-item-container {
    white-space: nowrap;
    cursor: default;
}

#details-container {
    flex: 1 1 auto;
    padding: 0 25px 25px 25px;
    height: 100%;
}

.list-item-selected {
    background-color: rgb(247, 247, 247);
    border-top: 1px solid #e2e2e2;
    border-bottom: 1px solid #e2e2e2;
    box-sizing: border-box;
    color: rgb(0, 0, 0);
}
</style>
