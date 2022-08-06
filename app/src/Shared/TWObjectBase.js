import C_ from "./ConstantsBase"
import utils from "./UtilsBase"

export function TWObject() {}

export function setTWObjectPrototypeFunctions(store) {
    // Check if the object's table matches the tableName, otherwise throw an exception
    TWObject.prototype.assertTable = function(tableName, functionName) {
        if (this.table !== tableName) {
            let caller
            // prettier-ignore
            try { caller = new Error().stack.split("\n")[2].trim().split(" ")[1].split(".").pop() } catch (error) { }
            throw `Invalid attempt to get ${functionName || caller}() on a ${this.table} object\n` + new Error().stack
        }
    }

    // Check if the object's table matches one of the tableNames, otherwise throw an exception
    TWObject.prototype.assertTables = function(tableNames, functionName) {
        if (!tableNames.includes(this.table)) {
            let caller
            // prettier-ignore
            try { caller = new Error().stack.split("\n")[2].trim().split(" ")[1].split(".").pop() } catch (error) { }
            throw `Invalid attempt to get ${functionName || caller}() on a ${this.table} object\n` + new Error().stack
        }
    }

    TWObject.prototype.has = function(field) {
        if (!this[field]) return false
        if (typeof this[field] === "string") return this[field].trim()
        return this[field]
    }

    TWObject.prototype.fullName = function() {
        this.assertTable("EMPLOYEES")
        return this.FIRST_NAME + " " + this.LAST_NAME
    }

    TWObject.prototype.fullNameFit = function() {
        this.assertTable("EMPLOYEES")
        const fullName = this.FIRST_NAME + " " + this.LAST_NAME
        if (fullName.length > 25) return this.FIRST_NAME.toUpperCase().substring(0, 1) + ". " + this.LAST_NAME
        return fullName
    }

    TWObject.prototype.canChat = function() {
        this.assertTable("EMPLOYEES")
        return [C_.eoOnline, C_.eoIdle].includes(this.ONLINE_STATUS)
    }

    TWObject.prototype.himHer = function() {
        this.assertTable("EMPLOYEES")
        if (this.GENDER === C_.egMale) return "him"
        if (this.GENDER === C_.egFemale) return "her"
        return "them"
    }

    TWObject.prototype.hasTranslation = function() {
        this.assertTable("PROJECTS")
        return [C_.ptTranslate, C_.ptTranslateProofread].includes(this.PROJECT_TYPE)
    }

    TWObject.prototype.hasProofreading = function() {
        this.assertTable("PROJECTS")
        return [C_.ptProofread, C_.ptTranslateProofread].includes(this.PROJECT_TYPE)
    }

    TWObject.prototype.isTranslating = function() {
        this.assertTable("TRANSLATIONS")
        return this.STATUS === C_.tsTranslating
    }

    TWObject.prototype.isProofreading = function() {
        this.assertTable("TRANSLATIONS")
        return this.STATUS === C_.tsProofreading
    }

    TWObject.prototype.hasCATTools = function() {
        this.assertTable("PROJECTS")
        return parseInt(this.CAT_TOOLS, 10) || (this.CAT_TOOLS_OTHER && this.CAT_TOOLS_OTHER.trim())
    }

    TWObject.prototype.project = function() {
        this.assertTable("SUBPROJECTS")
        // For translators, we set projectObject at login as a caching method
        return this.projectObject || store.project(this.PROJECT_ID)
    }

    TWObject.prototype.subproject = function() {
        this.assertTables(["TRANSLATIONS", "PROJECTS_MESSAGES"])
        // For translators, we set subprojectObject at login as a caching method
        return this.subprojectObject || store.subproject(this.SUBPROJECT_ID)
    }

    TWObject.prototype.isAssigned = function() {
        this.assertTable("TRANSLATIONS")
        return this.STATUS === C_.tsTranslating || this.STATUS === C_.tsProofreading
    }

    TWObject.prototype.employee = function() {
        this.assertTables(["TRANSLATIONS", "PROJECTS_FILES"])
        return store.employee(this.EMPLOYEE_ID)
    }

    TWObject.prototype.languageName = function() {
        this.assertTable("SUBPROJECTS")
        return store.languageName(this.LANGUAGE_ID)
    }

    TWObject.prototype.PONumber = function() {
        this.assertTable("TRANSLATIONS")
        let suffix = ""
        if (this.STATUS === C_.tsTranslating || this.STATUS === C_.tsUnassignedTranslation) suffix = "-T"
        if (this.STATUS === C_.tsProofreading || this.STATUS === C_.tsUnassignedProofreading) suffix = "-P"
        return `PO-${this.PK}${suffix}`
    }

    TWObject.prototype.translationPrice = function() {
        this.assertTable("TRANSLATIONS")

        const subproject = this.subproject()
        if (!subproject) return 0

        const project = subproject.project()
        if (!project) return 0
        const employee = store.employee(this.EMPLOYEE_ID)
        if (!employee) return 0

        let result = 0
        const status = this.STATUS
        let wordRate = 0
        if (status === C_.tsTranslating || status === C_.tsUnassignedTranslation) {
            // If the translation has a price set and it's smaller than 0.06, then use that rate
            if (this.PRICE > 0.001 && this.PRICE < 0.06) wordRate = this.PRICE
            // otherwise use the translator's standard rate (or default to 0.03)
            else wordRate = employee.RATE_TRANSLATION || 0.03
        }
        if (status === C_.tsProofreading || status === C_.tsUnassignedProofreading) wordRate = employee.RATE_PROOFREADING || 0.005

        if (this.PAYMENT_METHOD === C_.ptBySourceWords) result = project.SOURCE_WORDS * wordRate
        if (this.PAYMENT_METHOD === C_.ptFixedPrice) result = this.PRICE || 0
        if (this.PAYMENT_METHOD === C_.ptByCatAnalysis) {
            if (status === C_.tsTranslating || status === C_.tsUnassignedTranslation)
                result = wordRate * project.WORDS_NO_MATCH + 0.015 * project.WORDS_FUZZY_MATCH + 0.005 * project.WORDS_REPS
            if (status === C_.tsProofreading || status === C_.tsUnassignedProofreading)
                result = wordRate * project.WORDS_NO_MATCH + wordRate * project.WORDS_FUZZY_MATCH + wordRate * project.WORDS_REPS
        }
        if(project.UPWORK_PRICE) {
            result += project.UPWORK_PRICE;
        }

        return utils.roundPrice(result)
    }

    TWObject.prototype.amountCorrectionAsString = function(currencySymbol) {
        this.assertTable("TRANSLATIONS")
        if (this.AMOUNT_CORRECTION_PERCENT < 0) return (this.AMOUNT_CORRECTION_PERCENT + "%").replace("-", "- ")
        else if (this.AMOUNT_CORRECTION_PERCENT > 0) return "+" + this.AMOUNT_CORRECTION_PERCENT + "%"
        else if (this.AMOUNT_CORRECTION < 0) return (this.AMOUNT_CORRECTION + " " + currencySymbol).replace("-", "- ")
        else if (this.AMOUNT_CORRECTION > 0) return "+" + this.AMOUNT_CORRECTION + " " + currencySymbol
        return ""
    }

    TWObject.prototype.country = function() {
        if (this.table === "EMPLOYEES") return store.countryName(this.COUNTRY_ID)
    }

    TWObject.prototype.sender = function() {
        this.assertTable("PROJECTS_MESSAGES")
        const senders = {
            C2T: "Client",
            T2C: "Client",
            AM: "Assignment manager",
            DM: "Deadline manager",
            GM: "General manager",
            CM: "Care manager",
            MT: "Management team",
            MM: "Multitask manager",
            MTR: "Management team [R]",
            CL: "Client",
            CLR: "Client [R]",
            OS: "Online Support"
        }
        if (parseInt(this.SENDER, 10) > 0) return store.fullName(+this.SENDER)

        return senders[this.SENDER] || ""
    }

    TWObject.prototype.senderFirstName = function() {
        if (parseInt(this.SENDER, 10) > 0) return store.employee(this.SENDER).FIRST_NAME
        return "Someone"
    }

    TWObject.prototype.recipient = function() {
        this.assertTable("PROJECTS_MESSAGES")
        const senders = {
            C2T: "Client",
            T2C: "Client (not approved yet)",
            AM: "Assignment manager",
            DM: "Deadline manager",
            GM: "General manager",
            CM: "Care manager",
            MT: "Management team",
            MM: "Multitask manager",
            MTR: "Management team [R]",
            CL: "Client",
            CLR: "Client [R]",
            CCM: "Client complaints manager",
            FFT :"Management team"
        }
        if (parseInt(this.RECIPIENT, 10) > 0) return store.fullName(+this.RECIPIENT)
        return senders[this.RECIPIENT] || ""
    }

    TWObject.prototype.isTranslated = function() {
        this.assertTable("PROJECTS_FILES")
        return [C_.pfTranslated, C_.pfReopenedTranslated].includes(this.FILE_TYPE)
    }

    TWObject.prototype.isProofread = function() {
        this.assertTable("PROJECTS_FILES")
        return [C_.pfProofread, C_.pfReopenedProofread].includes(this.FILE_TYPE)
    }

    TWObject.prototype.hasLanguagePair = function(source, target) {
        this.assertTable("EMPLOYEES")
        if (!source || !target) return false
        for (let el of store.employeesLanguages) if (el.EMPLOYEE_ID === this.PK && el.SOURCE_LANGUAGE_ID === source && el.TARGET_LANGUAGE_ID === target) return true

        return false
    }

    TWObject.prototype.hasNativeLanguage = function(language) {
        this.assertTable("EMPLOYEES")
        return this.NATIVE_LANGUAGE_1_ID === language || this.NATIVE_LANGUAGE_2_ID === language
    }
}
