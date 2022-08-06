<template lang="pug">
#projects-deadlines-overview-wrapper(@mouseleave="isVisible = false")
    i.outline.clock.icon(@click="show")
    #popup-wrapper(v-show="isVisible" :style="{top: top, left: left}")
        .title Deadlines for {{ dateForTitle }}
        #columns
            div
                .item(v-for="item in itemsAM")
                    .hour {{ item.hour }}:00
                    .text {{ item.text }}
            div
                .item(v-for="item in itemsPM")
                    .hour {{ item.hour }}:00
                    .text {{ item.text }}

    
</template>

<script>
import store from "../../Store/Store"
import C_ from "../../Constants"
import utils from "../../Utils"

export default {
    props: {
        date: Number,
        position: { type: String, default: "bottom" }
    },

    data() {
        return {
            isVisible: false,
            top: 0,
            left: 0
        }
    },

    computed: {
        dateForTitle() {
            return utils.formatDate(this.date, "D MMM YYYY")
        },

        deadlinesCount() {
            const deadlines = {}
            const now = store.serverTime()

            store.projects.forEach(project => {
                if (project.isCompleted() || project.STATUS == C_.psCancelled) return
                if (utils.isSameDay(this.date, project.deadline())) {
                    const date = utils.date(project.deadline())
                    const hour = date.getHours()
                    deadlines[hour] = deadlines[hour] ? deadlines[hour] + 1 : 1
                }
            })
            return deadlines
        },

        itemsAM() {
            const items = []
            for (let i = 0; i <= 11; i++) {
                let text = ""
                for (let j = 0; j < this.deadlinesCount[i]; j++) text += "●"
                text = text.substring(0, 8)
                items.push({ hour: i < 10 ? "0" + i : i, text })
            }
            return items
        },

        itemsPM() {
            const items = []
            for (let i = 12; i <= 23; i++) {
                let text = ""
                for (let j = 0; j < this.deadlinesCount[i]; j++) text += "●"
                text = text.substring(0, 8)
                items.push({ hour: i, text })
            }
            return items
        }
    },

    methods: {
        show(event) {
            if (this.position === "right") {
                this.left = event.x - 120 + "px"
                this.top = "100px"
            } else {
                this.left = event.x - 150 + "px"
                this.top = event.y + 20 + "px"
            }
            this.isVisible = true
        }
    }
}
</script>

<style scoped>
#projects-deadlines-overview-wrapper {
    padding: 10px;
}
#popup-wrapper {
    border: thin solid grey;
    box-shadow: 0px 0px 15px -4px rgba(0, 0, 0, 0.33);
    padding: 15px;
    background-color: white;
    border-radius: 3px;
    position: fixed;
    z-index: 10000;
}

.title {
    font-weight: 700;
    text-align: center;
    padding-bottom: 8px;
}

#columns {
    display: flex;
    width: 250px;
    font-size: 12px;
}

.item {
    padding: 5px;
}

.hour {
    text-align: right;
    display: inline-block;
}

.text {
    width: 80px;
    display: inline-block;
    padding-left: 8px;
    text-align: left;
}
</style>