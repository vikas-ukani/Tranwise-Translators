import cmg from "../ConnectionManagerTR"
import store from "../../Shared/StoreBase"

const storeActions = {}

storeActions.composeAndSendEmployeeMessage = async function(employee, text) {
    if (!employee || !employee.PK) return

    const response = await store.vue.$showDialog({
        header: `Send message to ${employee.fullName()}`,
        message: `Type the message for ${employee.fullName()}:`,
        textAreaText: text || "",
        buttons: ["Cancel", "Send"],
        buttonClasses: ["", "positive"]
    })

    if (response.selection === "Send") this.sendEmployeeMessage(employee, response.text)
}

storeActions.sendEmployeeMessage = async function(recipient, text) {
    const employeeMessage = {
        table: "EMPLOYEES_MESSAGES",
        TO_ID: recipient.PK,
        MESSAGE: text,
        token: recipient.chatToken
    }

    cmg.insertObject(employeeMessage)
}

export default storeActions
