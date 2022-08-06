import { TWObject, setTWObjectPrototypeFunctions as setTWObjectPrototypeFunctionsBase } from "../../Shared/TWObjectBase"
import C_ from "../Constants"
import utils from "../Utils"
import benchmark from "../../Shared/BenchmarkManager"

export default TWObject

export function setTWObjectPrototypeFunctions(store) {
    setTWObjectPrototypeFunctionsBase(store)

    TWObject.prototype.nameWithTag = function() {
        this.assertTable("CLIENTS")
        let clientName = this.CLIENT_NAME
        if (this.NAME_TAG) clientName += ` [${this.NAME_TAG}]`
        return clientName
    }

    TWObject.prototype.clientNameWithTag = function() {
        this.assertTable("INVOICES")
        if (this.clientNameWithTagText) return this.clientNameWithTagText
        const client = store.client(this.CLIENT_ID)
        if (!client) return ""
        let clientName = client.CLIENT_NAME
        if (client.NAME_TAG) clientName += ` [${client.NAME_TAG}]`
        return clientName
    }

    TWObject.prototype.invoiceNumber = function() {
        this.assertTable("INVOICES")
        if (this.INVOICE_NUMBER) return this.INVOICE_NUMBER
        if (this.IS_USA_SPECIAL) return store.Settings("INVOICE_PREFIX_USA_SPECIAL") + this.PK.toString().padStart(5, "0")
        if (this.IS_MONTHLY) return store.Settings("INVOICE_PREFIX_MONTHLY") + this.PK.toString().padStart(5, "0")
        return store.Settings("INVOICE_PREFIX") + this.PK.toString().padStart(5, "0")
    }

    function projectIsOverdue() {
        let deadlineField = this.deadlineField()
        if (utils.isSameDay(this.DEADLINE_INTERMEDIATE, store.serverTime())) deadlineField = "DEADLINE_INTERMEDIATE"
        const deadline = this[deadlineField]
        const now = store.serverTime()
        return now >= deadline
    }

    function invoiceIsOverdue() {
        if (this.STATUS === C_.isPaid) return false
        const client = store.client(this.CLIENT_ID)
        if (!client) return false
        const termSeconds = (client.PAYMENT_TERMS || 30) * 86400
        return store.serverTime() - this.INVOICE_DATE > termSeconds
    }

    TWObject.prototype.isOverdue = function() {
        this.assertTables[("INVOICES", "PROJECTS")]
        if (this.table === "INVOICES") return invoiceIsOverdue.call(this)
        if (this.table === "PROJECTS") return projectIsOverdue.call(this)
    }

    function projectAssignedTranslations() {
        const result = []
        for (let translation of store.translations) {
            if (!translation.PK) continue
            const subproject = translation.subproject()
            if (!subproject) continue
            const project = subproject.project()
            if (!project || project.PK !== this.PK) continue
            if ([C_.tsTranslating, C_.tsProofreading].includes(translation.STATUS)) result.push(translation)
        }
        benchmark.trackFunctionCall("projectAssignedTranslations")
        return result
    }

    function subprojectAssignedTranslations() {
        const result = []
        for (let translation of store.translations) {
            if (!translation.PK) continue
            if (translation.SUBPROJECT_ID != this.PK) continue
            if ([C_.tsTranslating, C_.tsProofreading].includes(translation.STATUS)) result.push(translation)
        }
        benchmark.trackFunctionCall("subprojectAssignedTranslations")
        return result
    }

    TWObject.prototype.assignedTranslations = function() {
        this.assertTables(["PROJECTS", "SUBPROJECTS"])
        if (this.table === "PROJECTS") return projectAssignedTranslations.call(this)
        if (this.table === "SUBPROJECTS") return subprojectAssignedTranslations.call(this)
    }

    TWObject.prototype.hasStatus = function(statuses) {
        this.assertTable("PROJECTS")
        return statuses.includes(this.STATUS)
    }

    TWObject.prototype.isNotarizedOrCertified = function() {
        this.assertTable("PROJECTS")
        return this.IS_NOTARIZED || this.IS_CERTIFIED
    }

    TWObject.prototype.completionStatusCalculation = function() {
        this.assertTable("PROJECTS")
        const result = [0, 0, 0, 0, 0]

        if (!this.isInProgress()) return result

        benchmark.trackFunctionCall("completionStatusCalculation")

        const assignedTranslations = this.assignedTranslations()
        for (let translation of assignedTranslations) {
            if (translation.isTranslating()) {
                result[0]++
                if (translation.UPLOADED_ALL_FILES) result[1]++
                if (this.STATUS === C_.psReopened && !translation.CONFIRMED && translation.subproject().IS_REOPENED) result[4]++
            }

            if (translation.isProofreading()) {
                result[2]++
                if (translation.UPLOADED_ALL_FILES) result[3]++
            }
        }

        return result
    }

    TWObject.prototype.translationSymbol = function() {
        this.assertTable("TRANSLATIONS")
        if (this.STATUS === C_.tsTranslating) return "T"
        if (this.STATUS === C_.tsProofreading) return "P"
        return ""
    }

    TWObject.prototype.project = function() {
        this.assertTables(["SUBPROJECTS", "PROJECTS_MESSAGES"])
        return store.project(this.PROJECT_ID)
    }

    TWObject.prototype.isInProgress = function() {
        this.assertTable("PROJECTS")
        return [C_.psTranslation, C_.psProofreading, C_.psCheckPhase, C_.psReopened].includes(this.STATUS)
    }

    TWObject.prototype.isCompleted = function() {
        this.assertTable("PROJECTS")
        return [C_.psCompleted, C_.psCompletedAfterReopen].includes(this.STATUS)
    }

    TWObject.prototype.catToolsString = function() {
        this.assertTable("EMPLOYEES")
        const catToolsInitials = "TEWSRAXDM"
        const catTools = this.CAT_TOOLS
        if (!catTools) return ""
        let result = " "
        for (let i = 0; i <= 8; i++) {
            result += catTools[i] === "1" ? catToolsInitials[i] : " · "
        }

        // For Matecat, which uses byte 14
        result += catTools[13] === "1" ? "C" : " · "
        result = result.replace(/ {2}/g, " ")
        if (result === " · · · · · · · · · · ") result = ""
        return result
    }

    TWObject.prototype.subprojects = function() {
        this.assertTable("PROJECTS")
        return store.subprojects.filter(subproject => subproject.PROJECT_ID === this.PK)
    }

    TWObject.prototype.subprojectsCount = function() {
        this.assertTable("PROJECTS")
        let count = 0
        for (let subproject of store.subprojects) if (subproject.PROJECT_ID === this.PK) count++
        return count
    }

    TWObject.prototype.projectsFiles = function() {
        this.assertTable("PROJECTS")
        return store.projectsFiles.filter(projectFile => projectFile && projectFile.PROJECT_ID === this.PK)
    }

    TWObject.prototype.payments = function() {
        this.assertTable("PROJECTS")
        return store.projectsPayments.filter(payment => payment.PROJECT_ID === this.PK)
    }

    TWObject.prototype.refunds = function() {
        this.assertTable("PROJECTS")
        return store.projectsRefunds.filter(refund => refund.PROJECT_ID === this.PK)
    }

    TWObject.prototype.messages = function() {
        this.assertTable("PROJECTS")
        return store.projectsMessages.filter(message => message.PROJECT_ID === this.PK)
    }

    TWObject.prototype.services = function() {
        this.assertTable("PROJECTS")
        return store.projectsServices.filter(service => service.PROJECT_ID === this.PK)
    }

    TWObject.prototype.serviceName = function() {
        this.assertTable("PROJECTS_SERVICES")
        const serviceNames = ["", "Certification", "Notarization", "Shipping", "Document changes", "Extra copies", "Digital certification"]
        return serviceNames[this.SERVICE_TYPE]
    }

    // This function doesn't round the price, so it can return numbers like 123.000000001
    // So it is only used in the function below, which rounds this unrounded price.
    TWObject.prototype.totalPricePerLanguageNotRounded = function() {
        this.assertTable("PROJECTS")

        if (this.IS_CERTIFIED) {
            if (this.CERTIFIED_PAYMENT_METHOD === C_.ptFixedPrice) return this.CERTIFIED_BASE_PRICE || 0
            if (this.CERTIFIED_PAYMENT_METHOD === C_.ptBySourceWords) return this.CERTIFIED_PRICE_PER_WORD * this.SOURCE_WORDS || 0
            if (this.CERTIFIED_PAYMENT_METHOD === C_.ptByPages) return this.CERTIFIED_PRICE_PER_PAGE * this.PAGES_COUNT || 0
        }

        if (this.PAYMENT_CLIENT === C_.ptFixedPrice) return this.PRICE || 0
        if (this.PAYMENT_CLIENT === C_.ptBySourceWords) return this.PRICE * this.SOURCE_WORDS || 0
        if (this.PAYMENT_CLIENT === C_.ptByTargetWords) return this.PRICE * this.TARGET_WORDS || 0
        if (this.PAYMENT_CLIENT === C_.ptByCatAnalysis)
            return this.RATE_NO_MATCH * this.WORDS_NO_MATCH + this.RATE_FUZZY_MATCH * this.WORDS_FUZZY_MATCH + this.RATE_REPS * this.WORDS_REPS || 0

        return 0
    }

    TWObject.prototype.translationCost = function() {
        this.assertTable("PROJECTS")
        let cost = 0

        this.assignedTranslations().forEach(translation => {
            if (translation.STATUS === C_.tsTranslating) cost += translation.translationPrice()
        })

        return cost
    }

    TWObject.prototype.proofreadingCost = function() {
        this.assertTable("PROJECTS")
        let cost = 0

        this.assignedTranslations().forEach(translation => {
            if (translation.STATUS === C_.tsProofreading) cost += translation.translationPrice()
        })

        return cost
    }

    TWObject.prototype.totalPricePerLanguage = function() {
        this.assertTable("PROJECTS")
        return utils.roundPrice(this.totalPricePerLanguageNotRounded())
    }

    TWObject.prototype.totalPriceWithoutVAT = function() {
        this.assertTable("PROJECTS")
        if (this.IS_CERTIFIED) {
            const subprojectMultiplier = [C_.ptBySourceWords, C_.ptByPages].includes(this.CERTIFIED_PAYMENT_METHOD) ? this.subprojectsCount() : 1
            // prettier-ignore
            let result = this.totalPricePerLanguage() * subprojectMultiplier
                + (this.PRINT_COPIES_COUNT * this.PRICE_PER_PRINT_COPY || 0)
                + (this.EXTRA_COSTS || 0)
                + (this.INITIAL_SERVICES_COST || 0)
                + (this.SHIPPING_COST || 0)
            return utils.roundPrice(result)
        } else {
            let subprojectMultiplier = [C_.ptBySourceWords, C_.ptByCatAnalysis].includes(this.PAYMENT_CLIENT) ? this.subprojectsCount() : 1
            return utils.roundPrice(this.totalPricePerLanguage() * subprojectMultiplier)
        }
    }

    TWObject.prototype.totalPrice = function() {
        this.assertTable("PROJECTS")
        const vatRate = this.VAT_RATE || 0
        const vatMultiplier = 1 + vatRate / 100
        return utils.roundPrice(this.totalPriceWithoutVAT() * vatMultiplier) || 0
    }

    TWObject.prototype.totalCertifiedPrice = function() {
        this.assertTable("PROJECTS")
        const subprojectMultiplier = [C_.ptBySourceWords, C_.ptByPages].includes(this.CERTIFIED_PAYMENT_METHOD) ? this.subprojectsCount() : 1
        return utils.roundPrice(this.totalPricePerLanguage() * subprojectMultiplier) || 0
    }

    TWObject.prototype.currencySymbol = function() {
        this.assertTable("PROJECTS")
        return C_.currencySymbols[this.CURRENCY] || ""
    }

    TWObject.prototype.invoice = function() {
        this.assertTable("PROJECTS")
        return store.invoice(this.INVOICE_ID)
    }

    TWObject.prototype.deadlineForSorting = function() {
        this.assertTable("PROJECTS")
        let deadlineField = this.deadlineField()
        if (utils.isSameDay(this.DEADLINE_INTERMEDIATE, store.serverTime())) deadlineField = "DEADLINE_INTERMEDIATE"
        return this[deadlineField]
    }

    TWObject.prototype.client = function() {
        this.assertTables(["PROJECTS", "INVOICES"])
        return store.client(this.CLIENT_ID)
    }

    TWObject.prototype.division = function() {
        this.assertTable("CLIENTS")
        return store.division(this.DIVISION_ID)
    }

    TWObject.prototype.divisionName = function() {
        this.assertTable("CLIENTS")
        const division = store.division(this.DIVISION_ID)
        return division ? division.DIVISION : ""
    }

    TWObject.prototype.divisionCode = function() {
        this.assertTable("CLIENTS")
        const division = store.division(this.DIVISION_ID)
        return division ? division.DIVISION_CODE : ""
    }

    TWObject.prototype.notarizedAndCertifiedText = function() {
        this.assertTable("PROJECTS")
        if (this.IS_NOTARIZED && this.IS_CERTIFIED) return "notarized and certified"
        if (this.IS_NOTARIZED) return "notarized"
        if (this.IS_CERTIFIED) return "certified"
        return ""
    }

    TWObject.prototype.translatorsComments = function() {
        this.assertTable("PROJECTS")
        let comments = ""
        this.assignedTranslations().forEach(translation => {
            if (!utils.isBlank(translation.COMMENTS))
                comments += ` — ${translation.employee().fullName()} [${translation.shortLanguageName()}] — \n\n${translation.COMMENTS.trim()}\n\n`
        })
        return comments.slice(0, -2)
    }

    TWObject.prototype.deadline = function() {
        this.assertTable("PROJECTS")
        return this.STATUS === C_.psReopened || this.STATUS === C_.psCompletedAfterReopen ? this.DEADLINE_REOPENED : this.DEADLINE
    }

    TWObject.prototype.deadlineField = function() {
        this.assertTable("PROJECTS")
        return this.STATUS === C_.psReopened || this.STATUS === C_.psCompletedAfterReopen ? "DEADLINE_REOPENED" : "DEADLINE"
    }

    TWObject.prototype.shortLanguageName = function() {
        this.assertTable("TRANSLATIONS")
        return store.languageNameShort(this.subproject().LANGUAGE_ID)
    }

    TWObject.prototype.isIntoNordicLanguage = function() {
        this.assertTable("SUBPROJECTS")
        return ["Danish", "Swedish", "Norwegian", "Finnish"].includes(store.languageName(this.LANGUAGE_ID))
    }

    TWObject.prototype.messageText = function() {
        this.assertTable("PROJECTS_MESSAGES")
        let text = this.MESSAGE
        if (this.RECIPIENT === "T2C") text = `This is a message that ${this.sender()} wants to send to the client:\n\n${text}`
        if (this.SENDER === "C2T") text = `This is a message that the client wants to send to ${this.recipient()}:\n\n${text}`
        return text || ""
    }

    TWObject.prototype.isAboutCertification = function() {
        this.assertTable("PROJECTS_MESSAGES")
        const project = this.project()
        if (!project) return false
        // If all these conditions are true, the message is about certification
        return project.IS_CERTIFIED && this.RECIPIENT === "MT" && this.SENDER === "CL" && this.MESSAGE && this.MESSAGE.includes("The client has approved")
    }

    TWObject.prototype.monthsSinceLastLogin = function() {
        this.assertTable("EMPLOYEES")
        return Math.min(99, Math.round((Date.now() / 1000 - this.LAST_LOGIN_TIME) / 2592000)) // Seconds in a month
    }

    TWObject.prototype.senderName = function() {
        this.assertTable("TWILIO_MESSAGES")
        if (this.SENDER_ID === 1000000) return "Tranwise"
        if (this.SENDER_ID > 0) return store.fullName(this.SENDER_ID) || "???"
        return "Client"
    }
}
