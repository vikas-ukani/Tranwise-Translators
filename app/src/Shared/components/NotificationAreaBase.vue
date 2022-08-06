<template lang="pug">
    #notifications-wrapper
        #notification-popup.ui.raised.segment
            component(:is="notificationComponent" :options="notificationOptions")
        #notifications-list-wrapper
            #list
                #list-items
                    transition-group(name="list")
                        .notification-item(v-for="item in notifications" @click="clickNotification($event, item)" :key="item.id" :class="{ 'notification-important' : item.type === 'IMPORTANT','notification-feedback' : item.type === 'FEEDBACK', 'notification-template-project' : item.options.isForTemplateProject }" :style="{ 'border-color' : notificationColors ? notificationColors[item.type] : '#444444'}" :id="'notification-item-' + item.id") 
                            .notification-item-text(@click.stop="clickNotification($event, item)") {{item.title}} <br/> &nbsp;&nbsp;{{item.text}}
                    #notification-instructions Click on a notification for details<br/>and on the left colored bar to hide it
</template>

<script>
import store from "../StoreBase.js"

export default {
    data() {
        return {
            popupIsVisible: false,
            notificationOptions: undefined,
            notificationComponent: undefined
        }
    },

    computed: {
        notifications() {
            return store.notifications.slice().sort((a, b) => {
                if (a.type === "IMPORTANT" && b.type != "IMPORTANT") return -1
                if (a.type != "IMPORTANT" && b.type === "IMPORTANT") return 1
                return b.id - a.id
            })
        }
    },

    mounted() {
        const popup = $("#notification-popup")

        // Close the popup when clicking outside
        $(document).mouseup(e => {
            if (!popup.is(e.target) && popup.has(e.target).length === 0 && this.popupIsVisible) {
                this.hidePopup()
            }
        })

        // Register for notifications about the chat window toggling, in order to make the list shorter
        store.eventBus.$on("makeNotificationAreaShort", makeShort => {
            if (makeShort) $("#notifications-list-wrapper").addClass("short")
            else $("#notifications-list-wrapper").removeClass("short")
        })
    },

    methods: {
        clickNotification(event, notification) {
            // If the click is on the left border, remove the notification
            if (event.offsetX <= 0) store.removeNotification(notification.id)
            // otherwise show the popup
            else this.showPopup(event, notification)
        },

        showPopup(event, notification) {
            if (this.popupIsVisible) return

            // If there is no registered component with this name, return, as there's no popup to show
            if (!this.$options.components["Notification" + notification.type]) return

            // Otherwise set the notificationComponent, to be displayed in the popup
            this.notificationComponent = "Notification" + notification.type
            this.notificationOptions = notification.options || {}

            // Add a function that can be called in the notification component
            this.notificationOptions.closePopup = () => {
                this.hidePopup()
            }

            const target = $(event.target)
            const popup = $("#notification-popup")

            // Position the popup (in the next tick, so we can access the real height and width)
            this.$nextTick(() => {
                popup.css("top", Math.min($(window).height() - popup.height() - 40, Math.max(10, target.offset().top - (popup.height() - 24) / 2)))
                popup.css("left", target.offset().left - popup.width() - 50)
                popup.css("opacity", 100)
                popup.css("display", "block")
                if (!this.popupIsVisible) popup.addClass("show-popup-animation")
                this.popupIsVisible = true
            })
        },

        hidePopup() {
            const popup = $("#notification-popup")
            popup.removeClass("show-popup-animation")
            popup.css("opacity", 0)
            popup.css("display", "none")
            this.popupIsVisible = false
        }
    }
}
</script>

<style scoped>
#notifications-wrapper {
    background-color: #235d6c;
    overflow-y: auto;
    height: 100%;
    flex: 1 1 auto;
    cursor: default;
}

.show-popup-animation {
    -webkit-animation: show-popup-animation 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
    animation: show-popup-animation 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

@keyframes show-popup-animation {
    0% {
        -webkit-transform: translateX(0);
        transform: translateX(0);
        transform: scale(0.98);
    }
    100% {
        -webkit-transform: translateX(-3px);
        transform: translateX(-3px);
    }
}

.notification-item-text {
    overflow-x: hidden;
    white-space: nowrap;
}

.notification-item {
    background-color: rgb(245, 245, 245);
    padding: 8px 10px;
    margin: 9px 10px 0 10px;
    font-size: 11.5px;
    font-weight: 400;
    height: 54px;
    max-height: 54px;
    line-height: 1.7em;
    border-radius: 7px;
    box-shadow: 0px 0px 15px -4px rgba(0, 0, 0, 0.33);
    border-left-width: 7px;
    border-left-style: solid;
}

#notification-popup {
    min-width: 220px;
    position: fixed;
    opacity: 0;
    display: none;
    z-index: 1;
}

.notification-important {
    background-color: rgb(238, 190, 190);
    color: black;
}
.notification-feedback {
    background-color: rgb(203, 195, 227);
    color: black;
}
.notification-template-project {
    background-color: rgb(250, 217, 190) !important;
    color: black;
}

#notification-instructions {
    color: rgb(197, 210, 223);
    text-align: center;
    font-size: 11px;
    padding: 10px;
}

#notifications-list-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    box-sizing: border-box;
}

#notifications-list-wrapper.short {
    height: calc(100% - 400px) !important;
}

#list {
    flex: 100% 1 1;
    position: relative;
    overflow: auto;
}

#list-items {
    overflow: auto;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
}

.list-enter-active,
.list-leave-active,
.list-move {
    transition: 500ms cubic-bezier(0.59, 0.12, 0.34, 0.95);
    transition-property: opacity, transform;
}

.list-enter {
    opacity: 0;
    transform: translateX(-50px) scaleY(0.5);
}

.list-enter-to {
    opacity: 1;
    transform: translateX(0) scaleY(1);
}

.list-leave-active {
    position: absolute;
}

.list-leave-to {
    opacity: 0;
    transform: scaleY(0);
    transform-origin: center top;
}
</style>