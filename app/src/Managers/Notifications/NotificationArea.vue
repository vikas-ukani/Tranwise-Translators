<script>
import NotificationAreaBase from "../../Shared/components/NotificationAreaBase"
import NotificationTranslation from "../../Managers/Notifications/NotificationTranslation"
import NotificationPrepaymentDone from "../../Managers/Notifications/NotificationPrepaymentDone"
import NotificationDeliveredFile from "../../Managers/Notifications/NotificationDeliveredFile"
import NotificationIMPORTANT from "../../Managers/Notifications/NotificationMessage"
import NotificationFEEDBACK from "../../Managers/Notifications/NotificationMessage"
import store from "../Store/Store.js"

export default {
    extends: NotificationAreaBase,

    components: {
        NotificationTranslation,
        NotificationPrepaymentDone,
        NotificationDeliveredFile,
        NotificationIMPORTANT,
        NotificationFEEDBACK
    },

    props: {
        filters: Object
    },

    created() {
        this.notificationColors = {
            Welcome: "#2471A3",
            IMPORTANT: "#aa2222",
            Translation: "#ffa834",
            PrepaymentDone: "#72bb53",
            DeliveredFile: "#34bc9a",
            ClientEditedFile: "#7FECFF",
            ClientHadCommentsForFile: "#FFBEF9",
            ClientApprovedFile: "#D2B4DE",
            FEEDBACK :"#aa2222"
        }
    },

    computed: {
        notifications() {
            return store.notifications
                .slice()
                .filter(m => {
                    if (this.filters.hideAssignments && m.type === "Translation" && m.title && !m.title.includes("uploaded")) return false
                    if (this.filters.hideDeadlines && m.type === "Translation" && m.title && m.title.includes("uploaded")) return false
                    if (this.filters.hideProjectMessages && m.options && m.options.isProjectMessage) return false

                    return true
                })
                .sort((a, b) => {
                    if (a.type === "IMPORTANT" && b.type != "IMPORTANT") return -1
                    if (a.type != "IMPORTANT" && b.type === "IMPORTANT") return 1
                    return b.id - a.id
                })
        }
    }
}
</script>