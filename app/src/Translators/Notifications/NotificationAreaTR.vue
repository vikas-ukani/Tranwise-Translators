<script>
import NotificationAreaBase from "../../Shared/components/NotificationAreaBase"
// We can reuse the same component, NotificationMessageTR, but we have to import it as different components,
// because the notification area checks for a component named "Notification" + the notification type (eg. NotificationAssignment)
import NotificationIMPORTANT from "./NotificationMessageTR"
import NotificationAssignmentTranslation from "./NotificationMessageTR"
import NotificationAssignmentProofreading from "./NotificationMessageTR"
import NotificationUnassignment from "./NotificationMessageTR"
import NotificationNewProject from "./NotificationMessageTR"

export default {
    extends: NotificationAreaBase,

    components: {
        NotificationIMPORTANT,
        NotificationNewProject,
        NotificationAssignmentTranslation,
        NotificationAssignmentProofreading,
        NotificationUnassignment
    },

    created() {
        this.notificationColors = {
            Welcome: "#2471A3",
            IMPORTANT: "#aa2222",
            Translation: "#ffa834",
            NewProject: "#a978af",
            AssignmentTranslation: "#5c9fa9",
            AssignmentProofreading: "#7dcea0",
            Unassignment: "#a99f5c"
        }
    }
}
</script>
