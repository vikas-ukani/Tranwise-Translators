import { cmg, store, constants as C_ } from "../../CoreModules"

// Implements some methods that are used both in ProjectAssignmentRow and ProjectDeadlinesRow
export default {
    computed: {
        statusTextIcon() {
            if (this.translation.table === "EMPLOYEES") return ""
            const tr = this.translation
            if (tr.STATUS === C_.tsNone) return ""
            if (!tr.STATUS_TEXT || !tr.STATUS_TEXT.trim()) return "TranslationStatusTextOff.svg"
            if (tr.STATUS_TEXT === "<$A$>") return "TranslationStatusTextAsked.svg"
            return "TranslationStatusTextOn.svg"
        },

        responsivenessIcon() {
            if (!this.employee) return ""
            if (this.employee.RESPONSIVENESS === undefined) return ""
            return "Responsiveness" + (this.employee.RESPONSIVENESS + 2) + ".svg"
        },

        employeeStatusIcon() {
            if (!this.employee) return ""
            const path = "/static/icons/Employees/OnlineStatus"
            if (this.employee.IS_NOT_AVAILABLE) return path + "NotAvailable.svg"
            const status = this.employee.ONLINE_STATUS
            if (status == C_.eoOffline) return path + "Offline.svg"
            if (status == C_.eoOnline) return path + "Online.svg"
            if (status == C_.eoAway) return path + "Away.svg"
            if (status == C_.eoIdle) return path + "Idle.svg"
        }
    },

    methods: {
        async clickStatusText() {
            if (this.translation.table === "EMPLOYEES") return ""
            const tr = this.translation
            if (tr.status === C_.tsNone) return
            if (!tr.STATUS_TEXT.trim() || tr.STATUS_TEXT === "<$A$>") {
                if (!this.employee) return

                const response = await this.$showDialog({
                    header: "Ask for status",
                    message: `Do you want to send a message to ${this.employee.fullName()} asking for the job status?`
                })

                if (response.selection === "Yes") {
                    tr.STATUS_TEXT = "<$A$>"
                    cmg.updateObject(tr, "STATUS_TEXT", "<$A$>")
                    this.sendDeadlineReminder()
                }
            } else this.$showMessage("Translator's status", tr.STATUS_TEXT)
        },

        async clickResponsiveness() {
            if (!this.employee) return
            let responsiveness = this.employee.RESPONSIVENESS
            const response = await this.$showDialog({
                header: "Update responsiveness",
                message: "Do you want to increase or decrease " + this.employee.FIRST_NAME + "'s responsiveness level?",
                buttons: ["Cancel", "Decrease", "Increase"],
                buttonClasses: ["", "negative", "positive"]
            })

            if (response.selection === "Cancel") return
            if (response.selection === "Increase") responsiveness = Math.min(responsiveness + 1, 2)
            if (response.selection === "Decrease") responsiveness = Math.max(responsiveness - 1, -2)
            this.employee.RESPONSIVENESS = responsiveness
            cmg.updateObject(this.employee, "RESPONSIVENESS", responsiveness)
        },

        sendDeadlineReminder() {
            if (!this.translation) return
            const subproject = this.translation.subproject()
            if (!subproject) return
            const project = subproject.project()
            if (!project) return

            if ([C_.psCancelled, C_.psCompleted, C_.psCompletedAfterReopen].includes(project.STATUS)) return
            if (![C_.tsTranslating, C_.tsProofreading].includes(this.translation.STATUS)) return

            let didDeadlinePass = false
            const now = store.serverTime()
            if (this.translation.STATUS === C_.tsTranslating && now > project.DEADLINE_TRANSLATOR) didDeadlinePass = true
            if (this.translation.STATUS === C_.tsProofreading && now > project.DEADLINE_PROOFREADER) didDeadlinePass = true

            let message = ""
            if (this.translation.STATUS === C_.tsTranslating)
                message = `Dear translator,\n\nThis is a kind reminder that the deadline for project number ${project.PROJECT_NUMBER} ${
                    didDeadlinePass ? "has passed" : "is approaching"
                }.\n\n`
            if (this.translation.STATUS === C_.tsProofreading)
                message = `Dear proofreader,\n\nThis is a kind reminder that the deadline for project number ${project.PROJECT_NUMBER} ${
                    didDeadlinePass ? "has passed" : "is approaching"
                }.\n\n`

            message +=
                "Please be so kind to give us an update as the client is expecting for a delivery of your project on time and we are going to have big problems when we deliver too late.\n\nPlease go to this project's details, click on the Edit button for the status and fill in the expected time of your delivery and if you have any problems with it.\n\nThank you!"

            store.sendEmployeeMessage(this.employee, message)
        }
    }
}
