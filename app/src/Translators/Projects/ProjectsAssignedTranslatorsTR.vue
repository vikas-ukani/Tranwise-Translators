<template lang="pug">
#projects-assigned-translators-wrapper
    .translation-row.clickable(v-if="assignedTranslations.length" v-for="translation in assignedTranslations" @click="clickEmployee(translation)")
        .column.column-employee-status
            img(:src="employeeStatusIcon(translation)")
        .column.column-status(:class="{ 'status-t' : translation.isTranslating(), 'status-p' : translation.isProofreading() }") {{ translation.isTranslating() ? "TR" : "PR" }}
        .column {{ employeeName(translation) }}
        .column.column-timezone {{ timezoneText(translation) }}
    div(v-if="!assignedTranslations.length" style="padding: 7px") Nobody else is working on the project
</template>


<script>
import C_ from "../ConstantsTR"
import utils from "../UtilsTR"
import cmg from "../ConnectionManagerTR"
import store from "../Store/StoreTR"

export default {
    props: {
        project: { type: Object, default: () => {} },
        subproject: { type: Object, default: () => {} }
    },

    computed: {
        assignedTranslations() {
            return store.translations.filter(
                translation =>
                    translation.SUBPROJECT_ID === this.subproject.PK &&
                    [C_.tsTranslating, C_.tsProofreading].includes(translation.STATUS) &&
                    translation.EMPLOYEE_ID != store.myself.PK
            )
        }
    },

    methods: {
        clickEmployee(translation) {
            const emp = store.employee(translation.EMPLOYEE_ID)
            if (!emp) return
            if (emp.ONLINE_STATUS == C_.eoOffline) store.composeAndSendEmployeeMessage(emp)
            else store.chatWithEmployee(emp)
        },

        employeeStatusIcon(translation) {
            const emp = store.employee(translation.EMPLOYEE_ID)
            if (!emp) return ""
            const path = "/static/icons/Employees/OnlineStatus"
            if (emp.IS_NOT_AVAILABLE) return path + "NotAvailable.svg"
            const status = emp.ONLINE_STATUS
            if (status == C_.eoOffline) return path + "Offline.svg"
            if (status == C_.eoOnline) return path + "Online.svg"
            if (status == C_.eoAway) return path + "Away.svg"
            if (status == C_.eoIdle) return path + "Idle.svg"
        },

        employeeName(translation) {
            const employee = store.employee(translation.EMPLOYEE_ID)
            if (!employee) return ""
            return employee.fullName()
        },

        timezoneText(translation) {
            const employee = store.employee(translation.EMPLOYEE_ID)
            if (!employee) return ""

            let result = "GMT"
            const gmtOffset = Math.floor((employee.UTC_OFFSET - 3600) / 3600)
            if (gmtOffset > 0) result += "+"
            if (gmtOffset != 0) result += gmtOffset
            return result.replace("+", " + ").replace("-", " - ")
        }
    }
}
</script>

<style scoped>
#projects-assigned-translators-wrapper {
    height: 100%;
    width: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    border: thin solid rgb(187, 187, 187);
    border-radius: 5px;
    background-color: white;
    padding: 5px 8px;
    font-size: 12px;
}

.translation-row {
    display: flex;
}

.column-employee-status {
    margin-right: 10px;
}

.status-t {
    color: rgb(67, 187, 243);
}

.status-p {
    color: rgb(87, 201, 11);
}

.column-status {
    font-weight: 700 !important;
    width: 30px;
}

.column-timezone {
    color: rgb(168, 168, 168);
    margin-left: 10px;
}

.column {
    white-space: nowrap;
    padding: 3px 0;
}
</style>
