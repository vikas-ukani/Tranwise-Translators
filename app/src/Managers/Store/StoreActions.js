import cmg from "../ConnectionManager"
import store from "../../Shared/StoreBase"

const storeActions = {}

storeActions.approveProjectMessage = async function(message) {
    if (!message || !message.PK) return

    if (message.RECIPIENT === "T2C") {
        if (!(await this.$dialogCheck("Are you sure you want to approve this message from the translator / deadline manager and send it to the client in an email?"))) return
        cmg.updateObject(message, "RECIPIENT", "CL")
        cmg.updateObject(message, "IS_PROBLEM", false)
    }

    if (message.SENDER === "C2T") {
        if (!(await store.vue.$dialogCheck("Are you sure you want to approve this message from the client and allow the translator to see it?"))) return
        cmg.updateObject(message, "SENDER", "CL")
    }
}

storeActions.editAndApproveProjectMessage = async function(message) {
    if (!message || !message.PK) return

    const response = await store.vue.$showDialog({
        header: "Edit message",
        message: "Make the desired changes to the message and approve it or only save it.",
        textAreaText: message.MESSAGE,
        buttons: ["Cancel", "Only save the changes", "Save & approve"],
        buttonClasses: ["", "teal", "positive"]
    })

    if (response.selection === "Only save the changes") {
        cmg.updateObject(message, "MESSAGE", response.text)
        if (message.PROJECT_ID === 0) cmg.updateObject(message, "PREVIEW", response.text.replace(/\n/g, " ").substring(0, 30))
    }

    if (response.selection === "Save & approve") {
        cmg.updateObject(message, "MESSAGE", response.text)

        if (message.RECIPIENT === "T2C") {
            cmg.updateObject(message, "RECIPIENT", "CL")
            cmg.updateObject(message, "IS_PROBLEM", false)
        }

        if (message.SENDER === "C2T") {
            cmg.updateObject(message, "SENDER", "CL")
        }
    }
}

storeActions.editProjectMessage = async function(message) {
    if (!message || !message.PK) return

    const response = await store.vue.$showDialog({
        header: "Edit message",
        message: "Make the desired changes to the message.",
        textAreaText: message.MESSAGE,
        buttons: ["Cancel", "Save message"],
        buttonClasses: ["", "positive"]
    })

    if (response.selection === "Save message") {
        cmg.updateObject(message, "MESSAGE", response.text)
        if (message.PROJECT_ID === 0) cmg.updateObject(message, "PREVIEW", response.text.replace(/\n/g, " ").substring(0, 30))
    }
}

storeActions.updateProjectInUpwork  = async function(message,upWorkId,upWorkPrice) {
    // console.log(message,"UPWORK_PRICE",upWorkPrice);
    cmg.updateObject(message,"UPWORK_PRICE",parseInt(upWorkPrice));
    cmg.updateObject(message,"UPWORK_ID",upWorkId);
}

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

storeActions.sendProjectMessage = function(project, subproject, sender, recipient, text, isProblem, preview = "") {
    const projectMessage = {
        table: "PROJECTS_MESSAGES",
        PROJECT_ID: project ? project.PK : 0,
        SUBPROJECT_ID: subproject ? subproject.PK : 0,
        SENDER: sender,
        RECIPIENT: recipient,
        MESSAGE: text,
        IS_PROBLEM: isProblem,
        PREVIEW: preview,
        metadata: {
            PROJECT_NUMBER: project.PROJECT_NUMBER
        }
    }
    cmg.insertObject(projectMessage)
}

storeActions.addToProjectsHistory = function(project, action, details = "", isBySystem = false) {
    const projectsHistory = {
        table: "PROJECTS_HISTORY",
        PROJECT_ID: project.PK,
        ACTION: action,
        DETAILS: details,
        isBySystem
    }
    cmg.insertObject(projectsHistory)
}

storeActions.updateProjectImportantInformation = async function(project) {
    if (!project.PK) return
    const response = await store.vue.$showDialog({
        header: "Edit project",
        message: `Edit important information about project ${project.PROJECT_NUMBER}:`,
        textAreaText: project.IMPORTANT_INFORMATION,
        buttons: ["Cancel", "Save"],
        buttonClasses: ["", "positive"]
    })

    if (response.selection === "Save") {
        cmg.updateObject(project, "IMPORTANT_INFORMATION", response.text)
        return response.text
    } else return project.IMPORTANT_INFORMATION
}

export default storeActions
