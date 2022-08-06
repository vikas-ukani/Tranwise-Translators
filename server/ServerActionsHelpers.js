const C_ = require("./Constants")
const utils = require("./Utils")
const log = require("./Logger")

function currencySymbol(currency) {
    if (currency == "EUR") return "€"
    if (currency == "USD") return "$"
    if (currency == "GBP") return "£"
    return currency
}

function invoiceNumber(invoice) {
    if (invoice.INVOICE_NUMBER) return invoice.INVOICE_NUMBER
    if (invoice.IS_USA_SPECIAL) return "007-" + invoice.PK.toString().padStart(5, "0")
    if (invoice.IS_MONTHLY) return "005-" + invoice.PK.toString().padStart(5, "0")
    return "003-" + invoice.PK.toString().padStart(5, "0")
}

function translationPONumber(translation) {
    let suffix = ""
    if (translation.STATUS === C_.tsTranslating || translation.STATUS === C_.tsUnassignedTranslation) suffix = "-T"
    if (translation.STATUS === C_.tsProofreading || translation.STATUS === C_.tsUnassignedProofreading) suffix = "-P"
    return `PO-${translation.PK}${suffix}`
}

// This function doesn't round the price, so it can return numbers like 123.000000001
// So it is only used in the function below, which rounds this unrounded price.
function totalProjectPricePerLanguageNotRounded(project) {
    if (project.IS_CERTIFIED) {
        if (project.CERTIFIED_PAYMENT_METHOD === C_.ptFixedPrice) return project.CERTIFIED_BASE_PRICE || 0
        if (project.CERTIFIED_PAYMENT_METHOD === C_.ptBySourceWords) return project.CERTIFIED_PRICE_PER_WORD * project.SOURCE_WORDS || 0
        if (project.CERTIFIED_PAYMENT_METHOD === C_.ptByPages) return project.CERTIFIED_PRICE_PER_PAGE * project.PAGES_COUNT || 0
    }

    if (project.PAYMENT_CLIENT === C_.ptFixedPrice) return project.PRICE || 0
    if (project.PAYMENT_CLIENT === C_.ptBySourceWords) return project.PRICE * project.SOURCE_WORDS || 0
    if (project.PAYMENT_CLIENT === C_.ptByTargetWords) return project.PRICE * project.TARGET_WORDS || 0
    if (project.PAYMENT_CLIENT === C_.ptByCatAnalysis)
        return project.RATE_NO_MATCH * project.WORDS_NO_MATCH + project.RATE_FUZZY_MATCH * project.WORDS_FUZZY_MATCH + project.RATE_REPS * project.WORDS_REPS || 0

    return 0
}

function totalProjectPricePerLanguage(project) {
    if (!project) return
    return utils.roundPrice(totalProjectPricePerLanguageNotRounded(project))
}

function totalProjectPriceWithoutVAT(project, subprojectsCount) {
    if (!project) return
    if (subprojectsCount === undefined) return log("ERROR", "totalProjectPriceWithoutVAT: subprojectsCount is undefined")

    if (project.IS_CERTIFIED) {
        const subprojectMultiplier = [C_.ptBySourceWords, C_.ptByPages].includes(project.CERTIFIED_PAYMENT_METHOD) ? subprojectsCount : 1
        // prettier-ignore
        let result = totalProjectPricePerLanguage(project) * subprojectMultiplier
            + (project.PRINT_COPIES_COUNT * project.PRICE_PER_PRINT_COPY || 0)
            + (project.EXTRA_COSTS || 0)
            + (project.INITIAL_SERVICES_COST || 0)
            + (project.SHIPPING_COST || 0)
        return utils.roundPrice(result)
    } else {
        const subprojectMultiplier = [C_.ptBySourceWords, C_.ptByCatAnalysis].includes(project.PAYMENT_CLIENT) ? subprojectsCount : 1
        return utils.roundPrice(totalProjectPricePerLanguage(project) * subprojectMultiplier)
    }
}

function totalCalculatedProjectPrice(project) {
    if (!project) return 0
    return utils.roundPrice(project.CALCULATED_PRICE * (1 + (project.VAT_RATE || 0) / 100))
}

function employeeHasNativeLanguage(employee, languageID) {
    return employee && languageID && (employee.NATIVE_LANGUAGE_1_ID === languageID || employee.NATIVE_LANGUAGE_2_ID === languageID)
}

function projectNCText(project) {
    if (!project) return ""
    if (project.IS_CERTIFIED && project.IS_NOTARIZED) return "notarized and certified"
    if (project.IS_CERTIFIED) return "certified"
    if (project.IS_NOTARIZED) return "notarized"
}

function tradosBreakdownForEmail(project) {
    return (
        "Trados word count:\n" +
        `No match: ${project.WORDS_NO_MATCH} words (${project.RATE_NO_MATCH} ${project.CURRENCY} / wd )\n` +
        `Fuzzy match: ${project.WORDS_FUZZY_MATCH} words(${project.RATE_FUZZY_MATCH} ${project.CURRENCY} / wd )\n` +
        `100% match & reps: ${project.WORDS_REPS} words (${project.RATE_REPS} ${project.CURRENCY} / wd )\n`
    )
}

function projectShippingAddress(project) {
    if (!project.SHIPPING_STREET.trim()) return ""
    return (
        `${project.SHIPPING_NAME}\n` +
        `${project.SHIPPING_DETAILS}\n` +
        `${project.SHIPPING_STREET}\n` +
        `${project.SHIPPING_CITY}, ${project.SHIPPING_STATE} ${project.SHIPPING_ZIP}\n` +
        `${project.SHIPPING_COUNTRY}\n` +
        `Phone: ${project.SHIPPING_PHONE}`
    )
}
// The intervals which are in DST in Europe for 2020 - 2030
const dstIntervals = [
    "1585440000-1603584000", // 2020
    "1616889600-1635638400", // 2021
    "1648339200-1667088000", // 2022
    "1679788800-1698537600", // 2023
    "1711843200-1729987200", // 2024
    "1743292800-1761436800", // 2025
    "1774742400-1792886400", // 2026
    "1806192000-1824940800", // 2027
    "1837641600-1856390400", // 2028
    "1869091200-1887840000", // 2029
    "1901145600-1919289600" // 2030
]

function timestampIsDST(timestamp) {
    for (let interval of dstIntervals) {
        if (timestamp > interval.split("-")[0] && timestamp < interval.split("-")[1]) return true
    }
    return false
}

function dateForEmployee(date, employee) {
    if (!employee || !date) return 0

    // Convert the date from the server (CET time) to UTC
    // The server is UTC + 2 in the summer (when it's in DST) and UTC + 1 in the winter (when it's not in DST)
    const serverCorrection = timestampIsDST(date) ? 7200 : 3600

    return date - serverCorrection + employee.UTC_OFFSET
}

function dateWithUTCOffset(date, utcOffset) {
    if (!date) return 0

    // Convert the date from the server (CET time) to UTC
    // The server is UTC + 2 in the summer (when it's in DST) and UTC + 1 in the winter (when it's not in DST)
    const serverCorrection = timestampIsDST(date) ? 7200 : 3600

    return date - serverCorrection + utcOffset
}

function isTelegramIDValid(str) {
    if (typeof str != "string") return false
    if (!str.startsWith("00")) return false
    if (str.length < 8) return false
    return true
}

function validateMobileNumber(str) {
    if (typeof str != "string") return false
    if (str.length < 8) return false
    if (str.startsWith("0")) str = str.slice(1)
    if (str.startsWith("0")) str = str.slice(1)
    return str
}

module.exports = {
    currencySymbol,
    invoiceNumber,
    translationPONumber,
    totalProjectPriceWithoutVAT,
    totalCalculatedProjectPrice,
    projectNCText,
    employeeHasNativeLanguage,
    dateForEmployee,
    dateWithUTCOffset,
    isTelegramIDValid,
    validateMobileNumber,
    tradosBreakdownForEmail,
    projectShippingAddress
}
