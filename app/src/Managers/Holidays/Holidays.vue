<template lang="pug">
PageBase
    #holidays-page-wrapper(slot="page-contents")
        #holidays-calendar-wrapper.ui.raised.segment.padded
            #calendar-header
                div(style="display: flex")
                    div(style="flex-grow: 1")
                    i.chevron.left.icon(@click="decreaseMonth")
                    div(style="width: 180px; text-align: center") {{ theMonth }}
                    i.chevron.right.icon(@click="increaseMonth")
                    div(style="flex-grow: 1")
            #calendar-body
                .weekdays
                    .weekday(v-for="weekday in weekdays") {{ weekday }}
                .calendar-row
                    HolidaysDay(v-for="date in this.datesForRow(1)" :key="date.day" :day="date.day" :names="date.names" :weekend="date.weekend" @clickHolidayDay="clickDay")
                .calendar-row
                    HolidaysDay(v-for="date in this.datesForRow(2)" :key="date.day" :day="date.day" :names="date.names" :weekend="date.weekend" @clickHolidayDay="clickDay")
                .calendar-row
                    HolidaysDay(v-for="date in this.datesForRow(3)" :key="date.day" :day="date.day" :names="date.names" :weekend="date.weekend" @clickHolidayDay="clickDay")
                .calendar-row
                    HolidaysDay(v-for="date in this.datesForRow(4)" :key="date.day" :day="date.day" :names="date.names" :weekend="date.weekend" @clickHolidayDay="clickDay")
                .calendar-row
                    HolidaysDay(v-for="date in this.datesForRow(5)" :key="date.day" :day="date.day" :names="date.names" :weekend="date.weekend" @clickHolidayDay="clickDay")
                .calendar-row
                    HolidaysDay(v-for="date in this.datesForRow(6)" :key="date.day" :day="date.day" :names="date.names" :weekend="date.weekend" @clickHolidayDay="clickDay")
        #holidays-right-column
            #holidays-managers-list
                .holidays-manager-row.no-select(v-for="emp in managers" :key="emp.PK" @dblclick="showEmployeeHolidays(emp)" @click="selectEmployee(emp)" :class="{ selected: emp.PK === selectedEmployee.PK }") {{ emp.FIRST_NAME + " " + emp.LAST_NAME}}
            #holidays-instructions(v-if="canEdit")
                p To add a manager to the calendar, select a name and click on a date.
                p To add only half a day, hold down the Ctrl key and click on a date.
                p To remove a manager from a day, select a name and click on the day while holding down the Shift key.
                p Double-click on a manager's name to see the holidays for the selected year.
            #holidays-request.ui.form.tiny(v-else)
                h5(style="padding-top: 10px; margin-bottom: 6px") Request holiday
                .fields
                    .field(style="width: 150px")
                        TWCalendar(date-only :obj="holidayRequest" placeholder="From date" field="FROM_DATE" :change="updateHolidayRequest")
                    .field(style="padding-top: 7px")
                        TWCheckbox(label="Half day" :obj="holidayRequest" :change="updateHolidayRequest" field="IS_HALF_DAY")
                .fields
                    .field(style="width: 150px")
                        TWCalendar(date-only :obj="holidayRequest" placeholder="To date" field="TO_DATE" :change="updateHolidayRequest")
                    .field(style="font-size: 10px; padding-top: 2px")
                        p leave blank if only one day
                .field
                    TWInput(:obj="holidayRequest" field="WHO_WILL_REPLACE" placeholder="Who will replace you?" :change="updateHolidayRequest")
                .field
                    .ui.button.coolblue.tiny(@click="sendHolidayRequest") Send request
</template>

<script>
import { store, cmg, constants as C_, utils } from "../CoreModules"
import CoreMixin from "../../Shared/Mixins/CoreMixin"
import CoreMixinManagers from "../Mixins/CoreMixinManagers"
import HolidaysDay from "./HolidaysDay"

const longMonthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export default {
    mixins: [CoreMixin, CoreMixinManagers],

    components: {
        HolidaysDay
    },

    data() {
        return {
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            selectedEmployee: {},
            holidayRequest: {}
        }
    },

    computed: {
        theMonth() {
            return longMonthNames[this.month] + " " + this.year
        },

        weekdays() {
            return ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
        },

        managers() {
            const result = store.employees.filter(emp => emp.EMPLOYEE_TYPE === C_.etManager).sort((a, b) => a.fullName().localeCompare(b.fullName()))
            result.unshift({ PK: 0, FIRST_NAME: "« Public", LAST_NAME: "Holiday »" })
            return result
        },

        canEdit() {
            return store.permissions.holidaysCalendar
        }
    },

    methods: {
        datesForRow(rowNumber) {
            const firstDay = new Date(this.year, this.month - 1, 1)
            let startingDay = 1 - firstDay.getDay() + (rowNumber - 1) * 7

            const daysInMonth = new Date(this.year, this.month, 0).getDate()

            const dates = []
            for (let i = 0; i < 7; i++) {
                let day = startingDay + i
                if (day > daysInMonth) day = -day
                if (day < 0) {
                    if (rowNumber != 6) dates.push({ day: day, names: [], weekend: i == 0 || i == 6 })
                    continue
                }

                const timestampFrom = Math.floor(new Date(this.year, this.month - 1, day) / 1000)
                const timestampTo = timestampFrom + 24 * 3600

                // This ensures that we return the real server time, not the time in the local timezone
                const timezoneOffset = new Date().getTimezoneOffset() * 60

                let names = store.employeesHolidays
                    .filter(eh => eh.PK && eh.DATE + timezoneOffset >= timestampFrom && eh.DATE + timezoneOffset < timestampTo)
                    .map(eh => {
                        if (eh.EMPLOYEE_ID === 0) return "Public holiday"
                        return store.employee(eh.EMPLOYEE_ID).FIRST_NAME + (eh.IS_HALF_DAY ? " ½" : "")
                    })
                if (names.includes("Public holiday")) names = ["Public", "Holiday"]
                dates.push({ day, names, weekend: i == 0 || i == 6 })
            }
            return dates
        },

        increaseMonth() {
            if (this.month === 12) {
                this.month = 1
                this.year++
            } else this.month++
        },

        decreaseMonth() {
            if (this.month === 1) {
                this.month = 12
                this.year--
            } else this.month--
        },

        selectEmployee(employee) {
            if (!store.permissions.holidaysCalendar) return
            this.selectedEmployee = employee
        },

        showEmployeeHolidays(employee) {
            if (!store.permissions.holidaysCalendar) return

            let text = ""
            let totalDays = 0
            for (let holiday of store.employeesHolidays.sort((a, b) => a.DATE - b.DATE)) {
                if (holiday.EMPLOYEE_ID != employee.PK) continue
                const date = new Date(holiday.DATE * 1000)
                if (date.getFullYear() != this.year) continue

                text += "\n" + utils.formatDate(holiday.DATE, "D MMM YYYY")
                totalDays++
                if (holiday.IS_HALF_DAY) {
                    text += " (half day)"
                    totalDays -= 0.5
                }
            }
            this.$showMessage(text ? `Holidays for ${employee.fullName()} (${totalDays} days):\n${text}` : `${employee.fullName()} has no holidays for ${this.year}.`)
        },

        clickDay(day, event) {
            if (!store.permissions.holidaysCalendar) return
            if (this.selectedEmployee.PK === undefined) return
            if (day < 1) return

            const date = new Date(this.year, this.month - 1, day)
            const timestamp = date.getTime() / 1000 - new Date().getTimezoneOffset() * 60

            let foundHoliday
            store.employeesHolidays.forEach(eh => {
                if (eh.EMPLOYEE_ID === this.selectedEmployee.PK && eh.DATE === timestamp) foundHoliday = eh
            })

            // If deleting (shift is pressed) and we found a holiday, delete it
            if (event.shiftKey) {
                if (foundHoliday) cmg.deleteObject(foundHoliday)
                return
            }

            // If adding (shift is not pressed) and we found a holiday, return, so we don't add another one
            if (!event.shiftKey && foundHoliday) return

            // Otherwise add the holiday
            const holiday = {
                table: "EMPLOYEES_HOLIDAYS",
                DATE: timestamp,
                EMPLOYEE_ID: this.selectedEmployee.PK,
                IS_HALF_DAY: event.ctrlKey || event.metaKey
            }
            cmg.insertObject(holiday)
        },

        updateHolidayRequest(field, value) {
            this.$set(this.holidayRequest, field, value)
        },

        sendHolidayRequest() {
            const hr = this.holidayRequest
            if (this.$checkWithMessage(!hr.FROM_DATE || !hr.WHO_WILL_REPLACE, "Please fill in at least the from date and answer the replace question.")) return
            if (this.$checkWithMessage(hr.TO_DATE && hr.FROM_DATE > hr.TO_DATE, "The second date can't be earlier than the first date.")) return

            const fromDate = utils.formatDate(hr.FROM_DATE, "DD-MM-YYYY")
            const toDate = !hr.TO_DATE || hr.FROM_DATE === hr.TO_DATE ? "" : utils.formatDate(hr.TO_DATE, "DD-MM-YYYY")

            let link = `http://www.tranwiseweb.com/approveHoliday.php?id=${store.myself.PK}&from=${fromDate}&to=${toDate}&half=${hr.IS_HALF_DAY ? "1" : "0"}`
            link += "&code=" + btoa(store.myself.PK + fromDate + toDate).replace(/=/g, "")

            let emailSubject = store.myself.fullName() + " has requested a holiday for " + fromDate
            if (toDate) emailSubject += " to " + toDate
            else if (hr.IS_HALF_DAY) emailSubject += " (half day)"

            const emailText = emailSubject + `.\n\nWho will replace you?\n${hr.WHO_WILL_REPLACE}\n\nPlease click the link below to approve it.\n\n${link}`

            this.$delete(hr, "FROM_DATE")
            this.$delete(hr, "TO_DATE")
            this.$delete(hr, "IS_HALF_DAY")
            this.$delete(hr, "WHO_WILL_REPLACE")

            cmg.sendEmail("SYSTEM_EMAIL", "GENERAL_MANAGER_EMAIL", "Tranwise: " + emailSubject, emailText)

            this.$showMessage("Your request has been sent to the general manager. You will receive a confirmation email when it has been approved.")
        }
    }
}
</script>

<style scoped>
#holidays-page-wrapper {
    display: flex;
}

#holidays-calendar-wrapper {
    padding: 0;
    margin-left: 15px;
    margin-top: 10px;
    max-width: 718px;
}

#holidays-right-column {
    flex: 1 1 auto;
    max-width: 250px;
    padding: 10px;
}

#holidays-managers-list {
    width: 100%;
    height: 430px;
    border: thin solid rgb(175, 175, 175);
    border-radius: 5px;
    background-color: white;
    overflow-y: auto;
    font-size: 12px;
}

.holidays-manager-row {
    padding: 6px;
    cursor: pointer;
}

.holidays-manager-row.selected {
    background-color: rgb(235, 240, 243);
}

#holidays-instructions {
    font-size: 12px;
    padding-top: 20px;
    padding-left: 3px;
    padding-bottom: 5px;
}

#holidays-request {
    padding-bottom: 5px;
}

#calendar-header {
    padding: 14px 22px;
    background-color: #7ac859;
    border-radius: 5px 5px 0 0;
    font-size: 20px;
    font-weight: 300;
    color: white;
}

#calendar-body {
    padding: 15px;
}

.weekdays {
    display: flex;
}

.weekday {
    width: 88px;
    margin: 0 5px;
    text-align: center;
    font-size: 11px;
    color: rgb(128, 128, 128);
}

.calendar-row {
    display: flex;
}
</style>
