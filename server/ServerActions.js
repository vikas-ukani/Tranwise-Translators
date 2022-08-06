const db = require("./DatabaseManager")
const axios = require("axios")
const log = require("./Logger")
const utils = require("./Utils")
const config = require("./serverConfig.js")
const C_ = require("./Constants")
const pdf = require("./PDF")
const fs = require("fs")
const path = require("path")
const request = require("request")
const mailer = require("./Mailer")
const helper = require("./ServerActionsHelpers")
const execFile = require("child_process").execFile
const AITranslates = require('./AITranslates');
// === Setup the functions for processing messages generated here

// This dummy user is used to forward the messages generated here
const localUser = { isServer: true, pk: "Server" }

// We need the messageProcessor, to process the messages
let messageProcessor

function setMessageProcessor(mp) {
    messageProcessor = mp
}

// And the socketManager, to forward the messages to all users
let socketManager

function setSocketManager(sm) {
    socketManager = sm
    localUser.forwardMessage = socketManager.getMessageForwarderFunction()
}

// Process a message that is generated here
function sendLocalMessage(messageType, ...args) {
    if (messageProcessor[messageType]) messageProcessor[messageType].call(localUser, ...args)
}

// Forward a messages that is generated here
function forwardMessage(messageType, ...args) {
    localUser.forwardMessage(messageType, ...args)
}

function insertLocalObject(object, onInsertSuccess, onInsertFailure) {
    messageProcessor.INSERT_OBJECT.call(localUser, object, onInsertSuccess, onInsertFailure)
}

function insertLocalObjectPromise(object) {
    return new Promise(function (resolve) {
        messageProcessor.INSERT_OBJECT.call(
            localUser,
            object,
            insertedObject => resolve(insertedObject),
            () => resolve()
        )
    })
}

function replaceCustomFields(string, customFields) {
    if (!customFields) return string
    if (!Object.keys(customFields).length) return string

    const regex = new RegExp(
        Object.keys(customFields)
            .map(field => `#${field}#`)
            .join("|"),
        "gi"
    )

    return (string || "").replace(regex, value => customFields[value.replace(/#/g, "")])
}

// ===

const divisions = {}
;(async function loadDivisions() {
    const data = await db.getFullObjects("DIVISIONS")
    for (let obj of data) divisions[obj.PK] = obj
})()

const countries = {}
;(async function loadCountries() {
    const data = await db.getFullObjects("COUNTRIES")
    for (let obj of data) countries[obj.PK] = obj
})()

const languages = {}
;(async function loadLanguages() {
    const data = await db.getFullObjects("LANGUAGES")
    for (let obj of data) languages[obj.PK] = obj
})()

const emailTemplates = {}
;(async function loadEmailTemplates() {
    const data = await db.getFullObjects("EMAIL_TEMPLATES")
    for (let obj of data) emailTemplates[obj.EMAIL_TYPE] = obj
})()

const settingsItems = {}
;(async function loadSettings() {
    const data = await db.getFullObjects("SETTINGS")
    for (let obj of data) settingsItems[obj.PARAMETER] = obj
})()

let lastNotarizationNumber = 0
;(async function loadLastNotarizationNumber() {
    const lastProjectWithNotarization = await db.getObjectWithQuery("SELECT MAX(CAST(SUBSTRING(NOTARY_NUMBER, 3) AS DECIMAL)) AS LAST_NOTARIZATION_NUMBER FROM PROJECTS")
    if (!lastProjectWithNotarization) return log("ERROR", "Could not get last notarization number.")
    lastNotarizationNumber = lastProjectWithNotarization.LAST_NOTARIZATION_NUMBER
})()

function getNextNotarizationNumber() {
    return `TW${++lastNotarizationNumber}`
}

function settings(parameter) {
    if (!settingsItems[parameter]) return log("ERROR", `Missing Settings value for ${parameter}`) || ""
    return settingsItems[parameter].VALUE
}

function sendEmail(from, to, subject, text, attachments, options) {
    if (config.isDeployed) return mailer.sendEmail(from, to, subject, text || " ", attachments, options)

    console.log(`=== Sending email from ${from} to ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`${text}`)
    if (attachments) console.log(`Attachments: ${attachments}`)
}

function sendCustomEmail(from, to, subject, text) {
    if (["RECRUITMENT_EMAIL", "GENERAL_MANAGER_EMAIL", "SUPPORT_EMAIL", "TRAINING_EMAIL", "SYSTEM_EMAIL"].includes(from)) from = settings(from)
    if (["RECRUITMENT_EMAIL", "GENERAL_MANAGER_EMAIL", "SUPPORT_EMAIL", "TRAINING_EMAIL", "SYSTEM_EMAIL"].includes(to)) to = settings(to)
    sendEmail(from, to, subject, text)
}

function sendTemplateEmail(emailType, division, from, to, customFields, attachmentPath, options = {}) {
    const emt = emailTemplates[emailType]
    if (checkWithLog(!emt, `ServerActions.sendTemplateEmail: Wrong emailType = ${emailType}`)) return
    if (!to) return
    if (checkWithLog(!utils.isValidEmail(to), `ServerActions.sendTemplateEmail: Invalid email address = ${to} for emailType = ${emailType}`, true)) return

    if (!customFields) customFields = {}
    if (!customFields.email_footer) customFields.email_footer = division ? division.EMAIL_SIGNATURE : ""

    let subject = replaceCustomFields(emt.SUBJECT, customFields)
    let body = replaceCustomFields(emt.BODY, customFields)
    let bodyHTML = replaceCustomFields(emt.HTML_BODY, customFields)
    bodyHTML = utils.replaceReturns(bodyHTML, "<br />")

    // If the email template doesn't have plain text, set it from the HTML text
    if (!body.trim()) body = bodyHTML.replace(/<br *\/*>/gi, "\n")

    let htmlTemplate = ""

    if (emt.IS_HTML)
        // If the division is falsy, the email is for the translators
        htmlTemplate = division ? division.HTML_EMAIL_TEMPLATE : settings("HTML_EMAIL_TEMPLATE_FOR_TRANSLATORS")

    htmlTemplate = htmlTemplate.replace("#html_body_content#", bodyHTML).replace("#header_image#", emt.HEADER_IMAGE)

    if (!config.isDeployed) {
        console.log(`=== Sending template ${emailType} email from ${from} to ${to}`)
        console.log(emt.IS_HTML ? bodyHTML.replace(/<br *\/*>/gi, "\n") : body)
        if (attachmentPath) console.log(`Attachments: ${attachmentPath}`)
        return
    }

    if (htmlTemplate) mailer.sendHTMLEmail(from, to, subject, body, htmlTemplate, attachmentPath, options)
    else mailer.sendEmail(from, to, subject, body, attachmentPath, options)
}

async function sendEmailWithTypeForProject(emailType, pk) {
    if (
        [
            "QUOTE",
            "QUOTE_PREPAYMENT",
            "QUOTE_NOTARIZED_CERTIFIED",
            "QUOTE_NOTARIZED_CERTIFIED_REMINDER_1",
            "QUOTE_NOTARIZED_CERTIFIED_REMINDER_2",
            "QUOTE_VIDEO_INTERPRETING",
            "PROJECT_PREPAYMENT_RECEIVED"
        ].includes(emailType)
    ) {
        // Delay to ensure that the database has been updated with all the changes (especially prices)
        await utils.delay(5000)

        const projectInfo = await getProjectInformation(pk)
        if (!projectInfo) return log("ERROR", `sendEmailWithType: NEW_PROJECT - Undefined projectInfo for pk = ${pk}`)
        const project = projectInfo.project
        const client = projectInfo.client
        const division = projectInfo.division
        const currency = C_.currencySymbols[project.CURRENCY]
        const subprojectsCount = (projectInfo.targetLanguages.match(/,/g) || []).length + 1
        let targetLanguages = projectInfo.targetLanguages

        const mainFiles = await db.getObjectsWithQuery(`SELECT * FROM PROJECTS_FILES WHERE PROJECT_ID = ${pk} AND FILE_TYPE = 1`)
        let fileNames = ""
        let fileCount = 0
        for (let file of mainFiles)
            if (!(file.CONTENTS || "").startsWith("OCR-")) {
                fileNames += file.FILE_NAME + "\n"
                fileCount++
            }
        if (fileCount === 1) fileNames = "File name: " + fileNames + "\n"
        if (fileCount > 1) fileNames = "File names:\n" + fileNames + "\n"

        let sPrice = ""

        // if (project.PAYMENT_CLIENT === C_.ptFixedPrice) sPrice = "total of "
        // if (project.PAYMENT_CLIENT === C_.ptBySourceWords) sPrice = "price per source word of "
        // if (project.PAYMENT_CLIENT === C_.ptByTargetWords) sPrice = "price per word of "

        let priceAsString = utils.roundPrice(project.PRICE)
        // If the price is like 0.075 (has three decimal places), take that into account
        if (project.PRICE < 1 && (project.PRICE * 100) % 1 != 0) priceAsString = utils.roundPrice(project.PRICE, 3)

        sPrice += priceAsString + " " + project.CURRENCY
        if (project.PAYMENT_CLIENT === C_.ptByTargetWords) sPrice += " (the final cost will be calculated according to the number of target words)"

        if (project.PAYMENT_CLIENT === C_.ptByCatAnalysis) {
            const pricePerLanguage =
                (project.RATE_NO_MATCH || 0) * (project.WORDS_NO_MATCH || 0) +
                (project.RATE_FUZZY_MATCH || 0) * (project.WORDS_FUZZY_MATCH || 0) +
                (project.RATE_REPS || 0) * (project.WORDS_REPS || 0)
            sPrice = "price per language of " + utils.roundPrice(pricePerLanguage) + " " + project.CURRENCY
        }

        // if (project.IS_CERTIFIED) {
        //     if (project.CERTIFIED_PAYMENT_METHOD === C_.ptFixedPrice) sPrice = "translation price of " + project.CERTIFIED_BASE_PRICE + " " + project.CURRENCY
        //     if (project.CERTIFIED_PAYMENT_METHOD === C_.ptBySourceWords) sPrice = "price per source word of " + project.CERTIFIED_PRICE_PER_WORD + " " + project.CURRENCY
        //     if (project.CERTIFIED_PAYMENT_METHOD === C_.ptByPages) sPrice = "price per page of " + project.CERTIFIED_PRICE_PER_PAGE + " " + project.CURRENCY
        // }

        const tradosBreakdown = project.PAYMENT_CLIENT === C_.ptByCatAnalysis ? helper.tradosBreakdownForEmail(project) : ""

        const isNC = project.IS_NOTARIZED || project.IS_CERTIFIED

        let prepaymentInfo = ""
        if (project.REQUIRED_PREPAYMENT_PERCENT > 0 && project.REQUIRED_PREPAYMENT_PERCENT < 100)
            prepaymentInfo = `In order for us to start working on the project, we ask you to make a prepayment of ${project.REQUIRED_PREPAYMENT_PERCENT}% of the total price.\n\n`

        let services = ""
        const projectsServices = await db.getObjectsWithQuery(`SELECT * FROM PROJECTS_SERVICES WHERE PROJECT_ID = ${project.PK}`)
        for (let service of projectsServices) {
            if (!service.WAS_INITIAL) continue

            let serviceDetails = ""
            const cost = utils.roundPrice(service.COST)

            if (service.SERVICE_TYPE === C_.psCertification) serviceDetails = "Certification - $ " + cost
            if (service.SERVICE_TYPE === C_.psNotarization) serviceDetails = "Notarization - $ " + cost
            if (service.SERVICE_TYPE === C_.psDocumentChanges) serviceDetails = "Additional changes to your document - $ " + cost
            if (service.SERVICE_TYPE === C_.psExtraCopies) serviceDetails = `Extra copies ( ${service.ITEM_COUNT} ) - $ ` + cost
            if (service.SERVICE_TYPE === C_.psShipping) serviceDetails = "Shipping - $ " + cost
            if (service.SERVICE_TYPE === C_.psDigitalCertification) serviceDetails = "Digital certification - $ " + cost
            if (service.SERVICE_TYPE === C_.psDMVForm) serviceDetails = "DMV form - $ " + cost

            if (serviceDetails) services += serviceDetails + "\n"
        }

        const totalPriceToPay = project.CALCULATED_PRICE
        const prepaymentAmount = utils.roundPrice((totalPriceToPay * project.REQUIRED_PREPAYMENT_PERCENT) / 100)

        let code = `UTSPP-${project.PK}|${prepaymentAmount}|${project.CURRENCY}|${isNC ? 1 : 0}|${project.PROJECT_NUMBER}`
        code = Buffer.from(code).toString("base64")

        const paymentLink =
            `http://${division.EMAIL.replace("info@", "www.")}/charge-in-advance/?params=${code}` +
            utils
                .md5(`UTSPP-${project.PK}-${prepaymentAmount}-${project.CURRENCY}-${isNC ? 1 : 0}-${project.PROJECT_NUMBER}-tranwise_secret_key`)
                .slice(0, 7)
                .toLowerCase()

        let deadline = utils.formatDate(project.DEADLINE, "MMMM D, YYYY @ HH:mm") + " CET"
        if (client.COUNTRY_ID === 241) deadline = utils.formatDate(project.DEADLINE - 6 * 3600, "MMMM D, YYYY @ HH:mm") + " EST"

        if (project.TWILIO_STATUS > 0) {
            let phoneNumber = (projectInfo.client.PHONE_NUMBERS || "").split("\r\n")[0]

            sendTwilioSMSWithTemplate("TWILIO_SMS_QUOTE", phoneNumber, {
                project_number: project.PROJECT_NUMBER,
                source_language: languageWithID(project.SOURCE_LANGUAGE_ID),
                target_languages: targetLanguages.replace(/Target languages*: /g, ""),
                quote_comments: (project.QUOTE_COMMENTS || "").trim() ? "Comments: " + project.QUOTE_COMMENTS + "\n" : "",
                source_words: project.SOURCE_WORDS,
                price: totalPriceToPay + " " + project.CURRENCY,
                deadline: deadline,
                payment_link: paymentLink,
                divisionId: client.DIVISION_ID || 7,
                IS_WHATSAPP: project.TWILIO_STATUS === 2 ? 1 : 0
            })
        } else {
            let pricingInfo = "Translation: "

            if (project.CERTIFIED_PAYMENT_METHOD === C_.ptFixedPrice) pricingInfo += currency + " " + utils.roundPrice(project.CERTIFIED_BASE_PRICE)
            if (project.CERTIFIED_PAYMENT_METHOD === C_.ptBySourceWords)
                pricingInfo += currency + " " + utils.roundPrice(project.CERTIFIED_PRICE_PER_WORD * project.SOURCE_WORDS * subprojectsCount)
            if (project.CERTIFIED_PAYMENT_METHOD === C_.ptByPages)
                pricingInfo += currency + " " + utils.roundPrice(project.CERTIFIED_PRICE_PER_PAGE * project.PAGES_COUNT * subprojectsCount)


            pricingInfo +="\n Translation based on :";
            if (project.CERTIFIED_PAYMENT_METHOD === C_.ptFixedPrice)  pricingInfo += " Fixed Price ";
            else if (project.CERTIFIED_PAYMENT_METHOD === C_.ptBySourceWords) pricingInfo += " Price per source word ("+ project.SOURCE_WORDS +" word * "+currency+" "+ parseFloat(project.CERTIFIED_PRICE_PER_WORD).toFixed(2)+")";
            else if (project.CERTIFIED_PAYMENT_METHOD === C_.ptByPages) pricingInfo += " Price per page ("+ project.PAGES_COUNT +" pages * "+currency+" "+ parseFloat(project.CERTIFIED_PRICE_PER_PAGE).toFixed(2) +")";

            if (project.PRINT_COPIES_COUNT > 0)
                pricingInfo += `\nPrint ${project.PRINT_COPIES_COUNT} copies: ${currency} ${utils.roundPrice(project.PRINT_COPIES_COUNT * project.PRICE_PER_PRINT_COPY)}`

            if (project.SHIPPING_COST > 0) pricingInfo += `\nShipping: ${currency} ${utils.roundPrice(project.SHIPPING_COST)}`

            if (services) pricingInfo += "\nAdditional services (as listed below):" + services


            if (["QUOTE_NOTARIZED_CERTIFIED_REMINDER_1", "QUOTE_NOTARIZED_CERTIFIED_REMINDER_2"].includes(emailType)) if (client.IS_AGENCY || !isNC) return

            if (emailType === "QUOTE") {
                if (isNC && !client.IS_AGENCY) emailType = "QUOTE_NOTARIZED_CERTIFIED"
                else if (project.PREPAYMENT_STATUS === C_.ppsPrepaymentPending) emailType = "QUOTE_PREPAYMENT"
            }

            if (project.VIDEO_INTERPRETING_STATUS) emailType = "QUOTE_VIDEO_INTERPRETING"

            if (
                [
                    "QUOTE_PREPAYMENT",
                    "QUOTE_NOTARIZED_CERTIFIED",
                    "QUOTE_NOTARIZED_CERTIFIED_REMINDER_1",
                    "QUOTE_NOTARIZED_CERTIFIED_REMINDER_2",
                    "QUOTE_VIDEO_INTERPRETING",
                    "PROJECT_PREPAYMENT_RECEIVED"
                ].includes(emailType)
            )
                targetLanguages = targetLanguages.replace(/Target languages*: /g, "")

            let attachments = ""
            if (project.PREPAYMENT_STATUS === C_.ppsPrepaymentPending) {
                const info = await createPDFInvoice(null, client.PK, project.PK, true) // Create the proforma invoices
                attachments = info.documentPath

                // Send the invoice to invoices@division
                if (project.REQUIRED_PREPAYMENT_PERCENT < 100)
                    sendEmail(
                        division.EMAIL.replace("info@", "invoices@"),
                        division.EMAIL.replace("info@", "invoices@"),
                        `Proforma Invoice PF-${project.PK} ( ${project.REQUIRED_PREPAYMENT_PERCENT} % )`,
                        "",
                        attachments
                    )

                // UTS clients
                if (client.DIVISION_ID === 7) attachments += "," + config.invoiceResourcesPath + "UTS Guarantee and Privacy Policy.pdf"
            }

            let sourceWordsOrPagesText = "Source words: " + project.SOURCE_WORDS
            if (project.CERTIFIED_PAYMENT_METHOD === C_.ptByPages) sourceWordsOrPagesText = "Amount of pages: " + project.PAGES_COUNT

            sendTemplateEmail(
                emailType,
                division,
                division.EMAIL,
                project.PROJECT_EMAIL,
                {
                    certification_text: project.IS_CERTIFIED ? "Yes, FREE, WITH GUARANTEE OF USCIS ACCEPTANCE" : "No",
                    notarization_text: project.IS_NOTARIZED ? "Yes" : "No",
                    sending_by_post_text:
                        project.SHOULD_BE_SENT_BY_POST || project.SHIPPING_COST
                            ? "Yes, to the address below:\n\n" + helper.projectShippingAddress(project) || client.ADDRESS
                            : "No",
                    client_name: client.CLIENT_NAME,
                    client_order_number: project.CLIENT_ORDER_NUMBER,
                    project_number: project.PROJECT_NUMBER,
                    source_language: languageWithID(project.SOURCE_LANGUAGE_ID),
                    target_languages: targetLanguages,
                    quote_comments: (project.QUOTE_COMMENTS || "").trim() ? "Comments: " + project.QUOTE_COMMENTS + "\n\n" : "",
                    quote_details: (project.QUOTE_COMMENTS || "").trim() ? "Any special information regarding this quote:\n" + project.QUOTE_COMMENTS + "\n\n" : "", // Used for QUOTE_VIDEO_INTERPRETING
                    trados_breakdown: tradosBreakdown,
                    source_words: project.SOURCE_WORDS,
                    has_digital_certification: project.DIGITAL_CERTIFICATION_STATUS ? "Yes" : "No",
                    digital_certification_text: project.DIGITAL_CERTIFICATION_STATUS ? "Delivery extra: Certified Digital Hard Copy\n" : "",
                    source_words_or_pages: sourceWordsOrPagesText,
                    price: sPrice,
                    file_names: fileNames,
                    certified_pricing_details: pricingInfo,
                    prepayment_percentage_info: prepaymentInfo,
                    total_price: totalPriceToPay + " " + project.CURRENCY,
                    deadline: deadline,
                    link_for_tranwiseweb: linkForPortal(client.PK),
                    payment_link: paymentLink,
                    cancel_link: "http://www.tranwiseweb.com/cancelQuote.php?id=" + project.PK + "&code=" + utils.md5(project.PK + "TranwiseWebAPIKey"),
                    link_for_accepting: linkForTranwiseWeb("acceptQuote", client.PK, project.PK),
                    division_name: division.NAME
                },
                attachments
            )
        }
    }

    if (emailType === "NEW_PROJECT") {
        const projectInfo = await getProjectInformation(pk)
        if (!projectInfo) return log("ERROR", `sendEmailWithType: NEW_PROJECT - Undefined projectInfo for pk = ${pk}`)
        const project = projectInfo.project
        const client = projectInfo.client
        const division = projectInfo.division

        if (project.VIDEO_INTERPRETING_STATUS > 0) return

        let deadline = utils.formatDate(project.DEADLINE, "MMMM D, YYYY @ HH:mm") + " CET"
        if (client.COUNTRY_ID === 241) deadline = utils.formatDate(project.DEADLINE - 6 * 3600, "MMMM D, YYYY @ HH:mm") + " EST"

        sendTemplateEmail("NEW_PROJECT", division, division.EMAIL, project.PROJECT_EMAIL, {
            client_order_number: project.CLIENT_ORDER_NUMBER,
            project_number: project.PROJECT_NUMBER,
            source_language: languageWithID(project.SOURCE_LANGUAGE_ID),
            target_languages: projectInfo.targetLanguages,
            source_words: project.SOURCE_WORDS,
            deadline: deadline
        })
    }

    if (emailType === "PROJECT_IN_PROGRESS") {
        const projectInfo = await getProjectInformation(pk)
        if (!projectInfo) return log("ERROR", `sendEmailWithType: PROJECT_IN_PROGRESS - Undefined projectInfo for pk = ${pk}`)
        const project = projectInfo.project
        const client = projectInfo.client
        const division = projectInfo.division

        let paymentTerms = "30 days"
        if (client.PAYMENT_TERMS > 0) paymentTerms = `${client.PAYMENT_TERMS} days`

        let termsAndConditions = division.TERMS_LINK || ""
        if (termsAndConditions.trim()) termsAndConditions = "You can download our terms and conditions document from the following link: " + termsAndConditions

        let invoicedOnline = ""
        if (client.IS_INVOICED_ONLINE)
            invoicedOnline =
                `The total amount of this project is ${helper.totalCalculatedProjectPrice(project)} ${project.CURRENCY}. ` +
                "To get this into your online invoicing system, please reply to this email letting us know the following:\n\n" +
                "Your order number:\nYour PO number:\nYour PO amount:\n"

        let deadline = utils.formatDate(project.DEADLINE, "MMMM D, YYYY @ HH:mm") + " CET"
        if (client.COUNTRY_ID === 241) deadline = utils.formatDate(project.DEADLINE - 6 * 3600, "MMMM D, YYYY @ HH:mm") + " EST"
        const tradosBreakdown = project.PAYMENT_CLIENT === C_.ptByCatAnalysis ? helper.tradosBreakdownForEmail(project) : ""

        const mainFiles = await db.getObjectsWithQuery(`SELECT * FROM PROJECTS_FILES WHERE PROJECT_ID = ${pk} AND FILE_TYPE = 1`)
        let fileNames = ""
        let fileCount = 0
        for (let file of mainFiles)
            if (!(file.CONTENTS || "").startsWith("OCR-")) {
                fileNames += file.FILE_NAME + "\n"
                fileCount++
            }
        if (fileCount === 1) fileNames = "File name: " + fileNames + "\n"
        if (fileCount > 1) fileNames = "File names:\n" + fileNames + "\n"

        sendTemplateEmail("PROJECT_IN_PROGRESS", division, division.EMAIL, project.PROJECT_EMAIL, {
            client_order_number: project.CLIENT_ORDER_NUMBER,
            project_number: project.PROJECT_NUMBER,
            source_language: languageWithID(project.SOURCE_LANGUAGE_ID),
            target_languages: projectInfo.targetLanguages.replace(/Target languages*: /g, ""),
            source_words: project.SOURCE_WORDS,
            deadline: deadline,
            payment_terms: paymentTerms,
            terms_and_conditions: termsAndConditions,
            instructions_for_clients_invoiced_online: invoicedOnline,
            link_for_tranwiseweb: linkForPortal(client.PK),
            quote_comments: (project.QUOTE_COMMENTS || "").trim() ? "Comments: " + project.QUOTE_COMMENTS + "\n" : "",
            trados_breakdown: tradosBreakdown,
            total_price: project.CALCULATED_PRICE + " " + project.CURRENCY,
            file_names: fileNames,
        })

        updateObject(project.PK, "PROJECTS", "IN_PROGRESS_INFO_SENT", true)
    }

    if (emailType === "PROJECT_IN_PROGRESS_PREPAYMENT") {
        const projectInfo = await getProjectInformation(pk)
        if (!projectInfo) return log("ERROR", `sendEmailWithType: PROJECT_IN_PROGRESS_PREPAYMENT - Undefined projectInfo for pk = ${pk}`)
        const project = projectInfo.project
        const client = projectInfo.client
        const division = projectInfo.division
        const currency = C_.currencySymbols[project.CURRENCY]
        const subprojectsCount = (projectInfo.targetLanguages.match(/,/g) || []).length + 1

        let sourceWordsOrPagesText = "Source words: " + project.SOURCE_WORDS
        if (project.CERTIFIED_PAYMENT_METHOD === C_.ptByPages) sourceWordsOrPagesText = "Amount of pages: " + project.PAGES_COUNT

        let deadline = utils.formatDate(project.DEADLINE, "MMMM D, YYYY @ HH:mm") + " CET"
        if (client.COUNTRY_ID === 241) deadline = utils.formatDate(project.DEADLINE - 6 * 3600, "MMMM D, YYYY @ HH:mm") + " EST"

        let services = ""
        const projectsServices = await db.getObjectsWithQuery(`SELECT * FROM PROJECTS_SERVICES WHERE PROJECT_ID = ${project.PK}`)
        for (let service of projectsServices) {
            if (!service.WAS_INITIAL) continue

            let serviceDetails = ""
            const cost = utils.roundPrice(service.COST)

            if (service.SERVICE_TYPE === C_.psCertification) serviceDetails = "Certification - $ " + cost
            if (service.SERVICE_TYPE === C_.psNotarization) serviceDetails = "Notarization - $ " + cost
            if (service.SERVICE_TYPE === C_.psDocumentChanges) serviceDetails = "Additional changes to your document - $ " + cost
            if (service.SERVICE_TYPE === C_.psExtraCopies) serviceDetails = `Extra copies ( ${service.ITEM_COUNT} ) - $ ` + cost
            if (service.SERVICE_TYPE === C_.psShipping) serviceDetails = "Shipping - $ " + cost
            if (service.SERVICE_TYPE === C_.psDigitalCertification) serviceDetails = "Digital certification - $ " + cost
            if (service.SERVICE_TYPE === C_.psDMVForm) serviceDetails = "DMV form - $ " + cost

            if (serviceDetails) services += serviceDetails + "\n\n"
        }

        let pricingInfo = "Translation: "
        if (project.CERTIFIED_PAYMENT_METHOD === C_.ptFixedPrice) pricingInfo += currency + " " + utils.roundPrice(project.CERTIFIED_BASE_PRICE)
        if (project.CERTIFIED_PAYMENT_METHOD === C_.ptBySourceWords)
            pricingInfo += currency + " " + utils.roundPrice(project.CERTIFIED_PRICE_PER_WORD * project.SOURCE_WORDS * subprojectsCount)
        if (project.CERTIFIED_PAYMENT_METHOD === C_.ptByPages)
            pricingInfo += currency + " " + utils.roundPrice(project.CERTIFIED_PRICE_PER_PAGE * project.PAGES_COUNT * subprojectsCount)

        if (project.PRINT_COPIES_COUNT > 0)
            pricingInfo += `\nPrint ${project.PRINT_COPIES_COUNT} copies: ${currency} ${utils.roundPrice(project.PRINT_COPIES_COUNT * project.PRICE_PER_PRINT_COPY)}`

        if (project.SHIPPING_COST > 0) pricingInfo += `\nShipping: ${currency} ${utils.roundPrice(project.SHIPPING_COST)}`

        if (services) pricingInfo += "\n\nAdditional services (as listed below):\n\n" + services

        pricingInfo += "\n\n"

        const mainFiles = await db.getObjectsWithQuery(`SELECT * FROM PROJECTS_FILES WHERE PROJECT_ID = ${pk} AND FILE_TYPE = 1`)
        let fileNames = ""
        let fileCount = 0
        for (let file of mainFiles)
            if (!(file.CONTENTS || "").startsWith("OCR-")) {
                fileNames += file.FILE_NAME + "\n"
                fileCount++
            }
        if (fileCount === 1) fileNames = "File name: " + fileNames + "\n"
        if (fileCount > 1) fileNames = "File names:\n" + fileNames + "\n"

        sendTemplateEmail("PROJECT_IN_PROGRESS_PREPAYMENT", division, division.EMAIL, project.PROJECT_EMAIL, {
            client_order_number: project.CLIENT_ORDER_NUMBER,
            project_number: project.PROJECT_NUMBER,
            source_language: languageWithID(project.SOURCE_LANGUAGE_ID),
            target_languages: projectInfo.targetLanguages,
            source_words: project.SOURCE_WORDS,
            source_words_or_pages: sourceWordsOrPagesText,
            has_digital_certification: project.DIGITAL_CERTIFICATION_STATUS > 0 ? "Yes" : "No",
            certification_text: project.IS_CERTIFIED ? "Yes" : "No",
            notarization_text: project.IS_NOTARIZED ? "Yes" : "No",
            total_price: project.CALCULATED_PRICE + " " + project.CURRENCY,
            certified_pricing_details: pricingInfo,
            quote_comments: (project.QUOTE_COMMENTS || "").trim() ? "Comments: " + project.QUOTE_COMMENTS + "\n" : "",
            deadline: deadline,
            file_names: fileNames,
        })

        updateObject(project.PK, "PROJECTS", "IN_PROGRESS_INFO_SENT", true)
    }

    if (emailType === "REOPENED_PROJECT") {
        const projectInfo = await getProjectInformation(pk)
        if (!projectInfo) return log("ERROR", `sendEmailWithType: REOPENED_PROJECT - Undefined projectInfo for pk = ${pk}`)
        const project = projectInfo.project
        const client = projectInfo.client
        const division = projectInfo.division

        sendTemplateEmail("REOPENED_PROJECT", division, division.EMAIL, project.PROJECT_EMAIL, {
            client_order_number: project.CLIENT_ORDER_NUMBER,
            project_number: project.PROJECT_NUMBER,
            source_language: languageWithID(project.SOURCE_LANGUAGE_ID),
            target_languages: projectInfo.targetLanguages,
            source_words: project.SOURCE_WORDS,
            link_for_reopened_comments: linkForTranwiseWeb("replyReopenedProject", client.PK, project.PK)
        })
    }

    if (emailType === "ASK_CLIENT_FOR_REVIEW_TRANSLATOR") {
        const projectInfo = await getProjectInformation(pk)
        if (!projectInfo) return log("ERROR", `sendEmailWithType: ASK_CLIENT_FOR_REVIEW_TRANSLATOR - Undefined projectInfo for pk = ${pk}`)

        const project = projectInfo.project
        const division = projectInfo.division

        if (project.TWILIO_STATUS > 0) return
        let rate_translation_button_html = '<br>'
        projectInfo.subprojects.forEach((sp, index) => {
            let targetLang = languageWithID(sp.LANGUAGE_ID)
            rate_translation_button_html += `
            <a href="https://www.universal-translation-services.com/feedback/?id=${project.PROJECT_NUMBER}&&target=${sp.PK}" target="_blank" style="background-color:#1ea8c1;border-radius:50px;color:#ffffff;display:inline-block;font-size:12px;font-weight:bold;line-height:50px;text-align:center;text-decoration:none;width:200px;-webkit-text-size-adjust:none;height:50px;text-transform: uppercase;"> Rate ${targetLang} Translator</a>
            <br><br>`
        })
        sendTemplateEmail("ASK_CLIENT_FOR_REVIEW_TRANSLATOR", division, division.EMAIL, project.PROJECT_EMAIL, {
            rate_translation_button_html: rate_translation_button_html
        })
    }
    if (emailType === "ASK_CLIENT_FOR_REVIEW_TRANSLATOR_AND_TRUSTPILOT") {
        const projectInfo = await getProjectInformation(pk)
        if (!projectInfo) return log("ERROR", `sendEmailWithType: ASK_CLIENT_FOR_REVIEW_TRANSLATOR - Undefined projectInfo for pk = ${pk}`)

        const project = projectInfo.project
        const division = projectInfo.division

        if (project.TWILIO_STATUS > 0) return
        let rate_translation_button_html = '<br>'
        projectInfo.subprojects.forEach((sp, index) => {
            let targetLang = languageWithID(sp.LANGUAGE_ID)
            rate_translation_button_html += `
            <a href="https://www.universal-translation-services.com/feedback/?id=${project.PROJECT_NUMBER}&&target=${sp.PK}" target="_blank" style="background-color:#1ea8c1;border-radius:50px;color:#ffffff;display:inline-block;font-size:12px;font-weight:bold;line-height:50px;text-align:center;text-decoration:none;width:200px;-webkit-text-size-adjust:none;height:50px;text-transform: uppercase;"> Rate ${targetLang} Translator</a>
            <br><br>`
        })
        sendTemplateEmail("ASK_CLIENT_FOR_REVIEW_TRANSLATOR_AND_TRUSTPILOT", division, division.EMAIL, project.PROJECT_EMAIL, {
            rate_translation_button_html: rate_translation_button_html
        }, null, { bcc: settings("TRUSTPILOT_BCC_EMAIL") })
    }
}

async function sendHTTPGetRequest(url) {
    return new Promise(resolve => {
        const id = utils.getUniqueID().slice(0, 8)
        log("GET_REQUESTS", `[${id}] ${url}`, true)

        if (!config.isDeployed) return resolve("")

        axios
            .get(url)
            .then(response => {
                log("GET_REQUESTS", `[${id}] Response: ${response ? response.data : "null response"}`, true)
                resolve(response && response.data)
            })
            .catch(error => {
                log("ERROR", "sendHTTPGetRequest: " + error, true)
                log("GET_REQUESTS", `[${id}] ${error}`, true)
                let errorString = "Unknown Get Request Error"
                if (error.response && error.response.status) errorString = `${error.response.status} ${error.response.statusText}`
                resolve({ error: errorString })
            })
    })
}

async function sendHTTPPostRequestWithObject(url, parameters) {
    return new Promise(resolve => {
        const id = utils.getUniqueID().slice(0, 8)

        // eslint-disable-next-line quotes
        log("POST_REQUESTS", `[${id}] ${url} --- ${JSON.stringify(parameters).replace(/\\"/g, '"')}`, true)

        if (!config.isDeployed) return resolve("")

        axios
            .post(url, parameters)
            .then(response => {
                log("POST_REQUESTS", `[${id}] Response: ${response ? JSON.stringify(response.data) : "null response"}`, true)
                resolve(response.data)
            })
            .catch(error => {
                log("ERROR", "sendHTTPPostRequest: " + error)
                log("POST_REQUESTS", `[${id}] ${error}`, true)
                let errorString = "Unknown Get Request Error"
                if (error.response && error.response.status) errorString = `${error.response.status} ${error.response.statusText}`
                resolve({ error: errorString })
            })
    })
}

function sendHTTPPostRequestWithFormData(url, data) {
    const formData = {}
    for (let [key, value] of Object.entries(data)) {
        if (typeof value === "string") formData[key] = value
        else formData[key] = JSON.stringify(value)
    }

    const id = utils.getUniqueID().slice(0, 8)

    // eslint-disable-next-line quotes
    log("POST_REQUESTS", `[${id}] ${url} --- ${JSON.stringify(formData).replace(/\\"/g, '"')}`, true)

    if (!config.isDeployed) return

    request.post({ url, formData }, (error, httpResponse, body) => {
        if (error) {
            log("ERROR", "sendHTTPPostRequestWithFormData: " + error)
            log("POST_REQUESTS", `[${id}] ${error}`, true)
        } else log("POST_REQUESTS", `[${id}] Reponse: ${body}`, true)
    })
}

function sendTwilioSMS(phoneNumber, text, divisionId) {
    if (!config.isDeployed) return console.log(`=== Twilio message to ${phoneNumber}: ${text} to division: ${divisionId}`)

    sendHTTPPostRequestWithFormData(
        settings("TWILIO_SEND_MESSAGE_URL"),
        {
            PHONE_NUMBER: phoneNumber,
            MESSAGE: text,
            SECRET: "TranwiseTwilioSecret",
            DIVISION_ID: divisionId || 7
        },
        true
    )
}

function sendTwilioWhatsapp(phoneNumber, text, divisionId) {
    if (!config.isDeployed) return console.log(`=== Twilio whatsapp message to ${phoneNumber}: ${text} for ${divisionId}`)
    sendHTTPPostRequestWithFormData(
        settings("TWILIO_SEND_WHATSAPP_MESSAGE_URL"),
        {
            PHONE_NUMBER: phoneNumber,
            MESSAGE: text,
            SECRET: "TranwiseTwilioSecret",
            DIVISION_ID: divisionId
        },
        true
    )
}



function sendTwilioSMSWithTemplate(emailType, phoneNumber, customFields) {
    const emt = emailTemplates[emailType]
    if (checkWithLog(!emt, `ServerActions.sendTwilioSMSWithTemplate: Wrong emailType = ${emailType}`)) return

    // The Twilio message is not actually sent now. Here we just insert a TWILIO_MESSAGE in the database
    // and the actual SMS will be sent in performInsertActions
    insertLocalObject({
        table: "TWILIO_MESSAGES",
        PHONE_NUMBER: phoneNumber,
        MESSAGE: replaceCustomFields(emt.BODY, customFields),
        IS_ANSWERED: true,
        DIVISION_ID: customFields.divisionId || 7,
        IS_WHATSAPP: customFields.IS_WHATSAPP || 0
    })
}

async function subscribeToMailChimp(emailAddress, name, apiKey, listID, unsubscribe = false) {
    if (!utils.isValidEmail(emailAddress)) return
    if (!apiKey || !listID) return
    const dataCenter = apiKey.split("-")[1]
    if (!dataCenter) return

    let apiURL =
        `http://www.tranwiseweb.com/API/Mailchimp/mailchimp-redirect.php?method=listSubscribe&apikey=${apiKey}` +
        `&id=${listID}` +
        `&email_address=${emailAddress}` +
        `&datacenter=${dataCenter}`

    if (unsubscribe) apiURL += "&delete_member=1&send_goodbye=0&send_notify=0&output=php"
    // !!! fname= is converted in tranwiseweb to merge_vars[FNAME]= - fname isn't a valid Mailchimp parameter
    else apiURL += "&fname=" + name.replace(/ /g, "%20") + "&double_optin=0&send_welcome=0&output=php"

    await sendHTTPGetRequest(apiURL)
}

function checkWithLog(condition, errorMessage, skipConsole) {
    if (condition) log("ERROR", errorMessage, skipConsole)
    return condition
}

async function sendTelegramToEmployee(employeeID, text) {
    const employee = await db.getObjectWithQuery(`SELECT * FROM EMPLOYEES WHERE PK = ${db.escape(employeeID)}`)
    if (!employee) return

    if (!helper.isTelegramIDValid(employee.TELEGRAM_ID)) return

    text = text.replace(/[\\/"]/g, "") // Removes any quotes, \ and /
    text = text.replace(/\r\n/g, "\n")

    sendHTTPPostRequestWithFormData(
        settings("TELEGRAM_SEND_TO_EMPLOYEE_URL"),
        {
            messagedata: [
                {
                    key: "8b23eb912ecec0c86a4ca131964275bae2e520e2",
                    user_id: `${employee.PK}`,
                    name: employee.FIRST_NAME.replace(/"/g, ""),
                    surname: employee.LAST_NAME.replace(/"/g, ""),
                    phone: `+${employee.TELEGRAM_ID.slice(2)}`,
                    text: text
                }
            ]
        },
        true
    )
}

async function sendSMSToEmployee(employeeID, text) {
    if (typeof text != "string" || !text) return
    const employee = await db.getObjectWithQuery(`SELECT * FROM EMPLOYEES WHERE PK = ${db.escape(employeeID)}`)
    if (!employee) return

    const mobileNumber = helper.validateMobileNumber(employee.MOBILE_NUMBER)
    if (!mobileNumber) return

    let url =
        "http://api.clickatell.com/http/sendmsg?" +
        `user=${utils.encodeURI(settings("CLICKATELL_USERNAME"))}` +
        `&password=${utils.encodeURI(settings("CLICKATELL_PASSWORD"))}` +
        `&api_id=${utils.encodeURI(settings("CLICKATELL_APIID"))}` +
        `&from=${utils.encodeURI(settings("CLICKATELL_SENDER"))}` +
        "&mo=1" +
        `&to=${utils.encodeURI(mobileNumber.trim())}` +
        `&text=${utils.encodeURI(text.trim())}`

    const response = await sendHTTPGetRequest(url)
    if (response && response.error) log("ERROR", "sendSMSToEmployee: " + response.error, true)
}

async function unlockFileInOnlineEditor(projectID, fileID) {
    let url = "https://edit.tranwise.com/projects/unlock/" + projectID + "/" + fileID

    const response = await sendHTTPGetRequest(url)
    if (response && response.error) log("ERROR", "unlockFileInOnlineEditor: " + response.error, true)
}

async function sendOverdueInvoicesReminders(yearToStart, callback) {
    const projects = await db.getObjectsWithQuery(
        `SELECT PROJECTS.PK,PROJECTS.CLIENT_ID,PROJECTS.INVOICE_ID,PROJECTS.CURRENCY,CALCULATED_PRICE,VAT_RATE,PROJECT_EMAIL FROM PROJECTS INNER JOIN INVOICES ON invoice_id = invoices.pk INNER JOIN clients ON invoices.client_id = clients.pk AND invoices.STATUS = 0 AND clients.hold_reminders = 0 AND year(from_unixtime(invoice_date)) >= ${yearToStart} AND DATE(adddate(from_unixtime(invoice_date), if (payment_terms = 0, 30, payment_terms) + 7)) < DATE(NOW())`
    )
    const invoices = await db.getObjectsWithQuery(
        `SELECT INVOICES.PK,INVOICES.CLIENT_ID,INVOICE_DATE,IS_MONTHLY,INVOICE_NUMBER,IS_USA_SPECIAL,EMAIL_FOR_INVOICES,DIVISION_ID FROM INVOICES INNER JOIN clients ON client_id = clients.pk AND STATUS = 0 AND clients.hold_reminders = 0 AND year(from_unixtime(invoice_date)) >= ${yearToStart} AND DATE(adddate(from_unixtime(invoice_date), if (payment_terms = 0, 30, payment_terms) + 7)) < DATE(NOW())`
    )

    const invoiceAmounts = {}
    const invoiceCurrencies = {}
    const clientsEmails = {}
    const clientsEmailForInvoices = {}
    const clientsAmounts = {}
    const clientsCurrencies = {}
    const clientsDivisionIDs = {}

    for (let project of projects) {
        invoiceAmounts[project.INVOICE_ID] = (invoiceAmounts[project.INVOICE_ID] || 0) + project.CALCULATED_PRICE
        clientsAmounts[project.CLIENT_ID] = (clientsAmounts[project.CLIENT_ID] || 0) + project.CALCULATED_PRICE
        invoiceCurrencies[project.INVOICE_ID] = project.CURRENCY
        clientsCurrencies[project.CLIENT_ID] = project.CURRENCY
        clientsEmails[project.CLIENT_ID] = project.PROJECT_EMAIL
    }

    const invoicesStrings = {}

    for (let invoice of invoices) {
        const clientID = invoice.CLIENT_ID
        let invoicesString = invoicesStrings[clientID] || "Invoice\t\t\tDate\t\t\tAmount"
        let currency = invoiceCurrencies[invoice.PK] || "EUR"
        let amount = invoiceAmounts[invoice.PK] || 0
        invoicesString += `\n${helper.invoiceNumber(invoice)}\t\t${utils.formatDate(invoice.INVOICE_DATE, "D/M/YYYY")}\t\t${helper.currencySymbol(currency)} ${amount.toFixed(2)}`
        invoicesStrings[clientID] = invoicesString
        clientsEmailForInvoices[clientID] = invoice.EMAIL_FOR_INVOICES
        clientsDivisionIDs[clientID] = invoice.DIVISION_ID
    }

    const emailDate = utils.formatNow("MMMM D, YYYY")

    for (let [clientID, invoiceString] of Object.entries(invoicesStrings)) {
        let emailAddress = clientsEmailForInvoices[clientID] || ""
        if (!utils.isValidEmail(emailAddress)) emailAddress = clientsEmails[clientID] || ""
        if (checkWithLog(!utils.isValidEmail(emailAddress), `sendOverdueInvoicesReminders: Email <${emailAddress}> is invalid for clientID = ${clientID}`)) continue

        const division = divisions[clientsDivisionIDs[clientID]]
        if (checkWithLog(!division, `sendOverdueInvoicesReminders: Missing division for clientID = ${clientID}`)) continue

        if (checkWithLog(!clientsAmounts[clientID], `sendOverdueInvoicesReminders: Amount is invalid for clientID = ${clientID}`)) continue
        if (checkWithLog(!invoiceString, `sendOverdueInvoicesReminders: Invoice data not found for clientID = ${clientID}`)) continue

        let currency = clientsCurrencies[clientID] || "EUR"

        let paymentLink = "https://www.universal-translation-services.com/pay/"
        if (division.DIVISION === "NordicTrans") paymentLink = "https://www.nordictrans.com/paycc/"
        if (division.DIVISION === "DutchTrans") paymentLink = "https://www.dutchtrans.co.uk/pay-invoices/"

        sendTemplateEmail("REMINDER_ABOUT_ALL_OVERDUE_INVOICES", division, division.EMAIL.replace("info@", "invoices@"), emailAddress, {
            total_amount: helper.currencySymbol(currency) + " " + clientsAmounts[clientID].toFixed(2),
            invoices_text: invoiceString,
            email_date: emailDate,
            payment_link: paymentLink,
            email_footer: division.EMAIL_SIGNATURE
        })
    }

    if (callback) callback("OK")
}

async function sendOverdueInvoicesRemindersToClient(clientID, emailAddress) {
    const client = await db.getFullObject(clientID, "CLIENTS")
    if (!client) log("ERROR", `sendOverdueInvoicesRemindersToClient: client is undefined for ID = ${clientID}`)

    const division = divisions[client.DIVISION_ID]
    if (!division) log("ERROR", `sendOverdueInvoicesRemindersToClient: division is undefined for ID = ${client.DIVISION_ID}, clientID = ${clientID}`)

    const projects = await db.getObjectsWithQuery(
        `SELECT PROJECTS.PK,PROJECTS.CLIENT_ID,PROJECTS.INVOICE_ID,PROJECTS.CURRENCY,CALCULATED_PRICE,VAT_RATE,PROJECT_EMAIL FROM PROJECTS INNER JOIN INVOICES ON invoice_id = invoices.pk INNER JOIN clients ON invoices.client_id = ${clientID} AND invoices.client_id = clients.pk AND invoices.STATUS = 0 AND DATE(adddate(from_unixtime(invoice_date), if (payment_terms = 0, 30, payment_terms) + 7)) < DATE(NOW())`
    )
    const invoices = await db.getObjectsWithQuery(
        `SELECT INVOICES.PK,INVOICES.CLIENT_ID,INVOICE_DATE,INVOICE_NUMBER,IS_MONTHLY FROM INVOICES INNER JOIN clients ON client_id = ${clientID} AND invoices.client_id = clients.pk AND STATUS = 0 AND DATE(adddate(from_unixtime(invoice_date), if (payment_terms = 0, 30, payment_terms) + 7)) < DATE(NOW())`
    )

    const invoiceAmounts = {}
    const invoiceCurrencies = {}

    for (let project of projects) {
        invoiceAmounts[project.INVOICE_ID] = (invoiceAmounts[project.INVOICE_ID] || 0) + project.CALCULATED_PRICE
        invoiceCurrencies[project.INVOICE_ID] = project.CURRENCY
    }

    let invoicesString = ""
    let invoicesCount = 0
    for (let invoice of invoices) {
        let amount = invoiceAmounts[invoice.PK]
        if (!amount) continue

        let currency = invoiceCurrencies[invoice.PK] || "EUR"
        invoicesString += `\n${helper.invoiceNumber(invoice)} on ${utils.formatDate(invoice.INVOICE_DATE, "D/M/YYYY")} - ${helper.currencySymbol(currency)} ${amount.toFixed(2)}`

        invoicesCount++
    }

    if (invoicesCount > 5)
        sendTemplateEmail("REMINDER_ABOUT_OVERDUE_INVOICES", division, division.EMAIL.replace("info@", "invoices@"), emailAddress, {
            invoices_text: invoicesString
        })
}

// !! The translation object should include the RATE_TRANSLATION and RATE_PROOFREADING fields normally found on EMPLOYEE
// and the SOURCE_WORDS, WORDS_NO_MATCH, WORDS_FUZZY_MATCH, WORDS_REPS fields, which are of the PROJECT
function getTranslationPrice(tr) {
    let result = 0
    let wordRate = 0

    if (tr.STATUS === C_.tsTranslating) {
        // If the translation has a price set and it's smaller than 0.06, then use that rate
        if (tr.PRICE > 0.001 && tr.PRICE < 0.06) wordRate = tr.PRICE || 0
        // otherwise use the translator's standard rate (or default to 0.03)
        else wordRate = tr.RATE_TRANSLATION || 0.03
    }

    if (tr.STATUS === C_.tsProofreading) wordRate = tr.RATE_PROOFREADING || 0.005

    if (tr.PAYMENT_METHOD === C_.ptFixedPrice) result = tr.PRICE || 0
    if (tr.PAYMENT_METHOD === C_.ptBySourceWords) result = tr.SOURCE_WORDS * wordRate
    if (tr.PAYMENT_METHOD === C_.ptByCatAnalysis) {
        if (tr.STATUS === C_.tsTranslating) result = wordRate * tr.WORDS_NO_MATCH + 0.015 * tr.WORDS_FUZZY_MATCH + 0.005 * tr.WORDS_REPS
        if (tr.STATUS === C_.tsProofreading) result = wordRate * tr.WORDS_NO_MATCH + wordRate * tr.WORDS_FUZZY_MATCH + wordRate * tr.WORDS_REPS
    }

    return utils.roundPrice(result)
}

async function generateMonthlyProjectsReport(month, year, callback) {
    const paymentTypes = { 0: "", 1: "Fixed price", 2: "By source words", 3: "By target words", 4: "By CAT analysis" }
    const header = "PROJECT\t\tCLIENT\tMANAGER\tDATE COMPLETED\tWORDS\tIS TEST TRANSLATION\tPRICE\tCURRENCY\tPROFIT\tPROFIT %\tINVOICE\tTRANSLATOR PAYMENT\tPROOFREADER PAYMENT\t"
    const mainList = [header]
    const listToCheck = [header]
    const zeroPayments = []

    const fromTimestamp = utils.getTimestamp(year, month, 1)
    const toTimestamp = month === 12 ? utils.getTimestamp(year + 1, 1, 1) : utils.getTimestamp(year, month + 1, 1)

    const conditions = `PROJECTS.STATUS IN (8, 9) AND DATE_COMPLETED >= ${fromTimestamp} AND DATE_COMPLETED < ${toTimestamp}`

    const projectsQuery =
        "SELECT PROJECTS.PK,PROJECT_NUMBER,SOURCE_WORDS,IS_TEST_TRANSLATION,PROJECTS.CURRENCY,INVOICE_ID,RESPONSIBLE_MANAGER,DATE_COMPLETED,PAYMENT_TRANSLATOR,PAYMENT_PROOFREADER," +
        "WORDS_NO_MATCH,WORDS_FUZZY_MATCH,WORDS_REPS,RATE_NO_MATCH,RATE_FUZZY_MATCH,RATE_REPS,INVOICE_ID,CLIENT_NAME,CALCULATED_PRICE,VAT_RATE FROM PROJECTS" +
        ` JOIN CLIENTS ON CLIENT_ID = CLIENTS.PK AND ${conditions} ORDER BY PROJECTS.PK`
    const projects = {}
    const projectsArray = await db.getObjectsWithQuery(projectsQuery)
    projectsArray.forEach(project => (projects[project.PK] = project))

    const subprojectsQuery =
        `SELECT SUBPROJECTS.PK,PROJECT_ID,LANGUAGE_ID,INTERMEDIATE_LANGUAGE_ID,LANGUAGE FROM SUBPROJECTS JOIN PROJECTS ON PROJECT_ID = PROJECTS.PK AND ${conditions} ` +
        "JOIN LANGUAGES ON LANGUAGE_ID = LANGUAGES.PK ORDER BY SUBPROJECTS.PK"
    const subprojects = {}
    const subprojectsArray = await db.getObjectsWithQuery(subprojectsQuery)
    subprojectsArray.forEach(subproject => (subprojects[subproject.PK] = subproject))

    const translationsQuery =
        "SELECT TRANSLATIONS.STATUS,SUBPROJECT_ID,EMPLOYEE_ID,TRANSLATIONS.PAYMENT_METHOD,TRANSLATIONS.PRICE,SOURCE_WORDS,FIRST_NAME,LAST_NAME,RATE_TRANSLATION,RATE_PROOFREADING," +
        "WORDS_NO_MATCH,WORDS_FUZZY_MATCH,WORDS_REPS " +
        "FROM TRANSLATIONS " +
        "JOIN SUBPROJECTS ON SUBPROJECT_ID = SUBPROJECTS.PK JOIN EMPLOYEES ON EMPLOYEE_ID = EMPLOYEES.PK " +
        `JOIN PROJECTS ON PROJECT_ID = PROJECTS.PK AND ${conditions} AND TRANSLATIONS.STATUS IN (1, 2)`
    const translationsArray = await db.getObjectsWithQuery(translationsQuery)
    translationsArray.forEach(translation => {
        const subproject = subprojects[translation.SUBPROJECT_ID]
        if (!subproject.translations) subproject.translations = []
        subproject.translations.push(translation)
    })

    subprojectsArray.forEach(sub => {
        const project = projects[sub.PROJECT_ID]
        if (!project.subprojects) project.subprojects = []
        project.subprojects.push(sub)
    })

    projectsArray.forEach(p => {
        let translationsCost = 0
        let proofreadingsCost = 0
        const projectPrice = utils.roundPrice(p.CALCULATED_PRICE * (1 + p.VAT_RATE / 100))
        let str =
            `${p.PROJECT_NUMBER}\t\t${p.CLIENT_NAME}\t${p.RESPONSIBLE_MANAGER}\t${utils.formatDate(p.DATE_COMPLETED, "D/M/YYYY")}\t${p.SOURCE_WORDS}\t` +
            `${p.IS_TEST_TRANSLATION ? "YES" : ""}\t${projectPrice.toFixed(2)}\t ${p.CURRENCY}\tNET_PROFIT\tNET_PERCENT\t${p.INVOICE_ID || ""}\t` +
            `${paymentTypes[p.PAYMENT_TRANSLATOR]}\t${paymentTypes[p.PAYMENT_PROOFREADER]}\t`

        if (!p.subprojects) p.subprojects = []

        let subStr = ""
        p.subprojects.forEach(subproject => {
            subStr += `\n\t*** ${subproject.LANGUAGE}`
            if (subproject.INTERMEDIATE_LANGUAGE_ID) subStr += " (and Intermediate)"
            let translatorsStr = "\t    Translators:  "
            let proofreadersStr = "\t    Proofreaders:  "

            if (!subproject.translations) subproject.translations = []
            subproject.translations.forEach(tr => {
                let translationPrice = getTranslationPrice(tr)

                if (tr.STATUS === 1) {
                    translatorsStr += tr.FIRST_NAME + " " + tr.LAST_NAME + ", "
                    translationsCost = translationsCost + translationPrice
                }
                if (tr.STATUS === 2) {
                    proofreadersStr += tr.FIRST_NAME + " " + tr.LAST_NAME + ", "
                    proofreadingsCost = proofreadingsCost + translationPrice
                }

                if (translationPrice === 0) zeroPayments.push(p.PROJECT_NUMBER + " " + subproject.LANGUAGE + ": " + tr.FIRST_NAME + " " + tr.LAST_NAME)
            })
            subStr += `\n${translatorsStr.slice(0, -2)}\n${proofreadersStr.slice(0, -2)}`
        })

        str = str.replace("NET_PROFIT", (projectPrice - translationsCost - proofreadingsCost).toFixed(2))

        let netPercent = -100
        if (projectPrice > 0) netPercent = utils.roundPrice(((projectPrice - translationsCost - proofreadingsCost) / projectPrice) * 100, 0)

        str = str.replace("NET_PERCENT", netPercent)

        if (Math.round(netPercent) < 50) str += "\tCHECK"
        str += subStr

        mainList.push(str + "\n")
        if (netPercent < 50) listToCheck.push(str + "\n")
    })

    if (zeroPayments.length) {
        let text = `\tThe following translators have the payment set to 0:\n\t${zeroPayments.join("\n")}`
        mainList.push(text)
        listToCheck.push(text)
    }

    const mainListString = mainList.join("\n")

    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    fs.writeFile(config.storeFolder + "Files/0B_REQUESTED_FILES/" + `Monthly Projects Report - ${monthNames[month]} ${year} - FOR CHECK.xls`, listToCheck.join("\n"), err => {
        if (err) console.log(err)
    })

    fs.writeFile(config.storeFolder + "Files/0B_REQUESTED_FILES/" + `Monthly Projects Report - ${monthNames[month]} ${year}.xls`, mainListString, err => {
        if (err) return console.log(err)
        if (typeof callback === "function") callback()
    })
}

async function createPaymentSheets(month, year, completedCallback, justLog) {
    // This object stores the payment sheet information for each employee
    const employeesList = {}

    console.log(`Creating payment sheets for ${month} ${year} ${justLog ? "- just logging" : ""}`)

    const fromTimestamp = utils.getTimestamp(year, month, 1)
    const toTimestamp = month === 12 ? utils.getTimestamp(year + 1, 1, 1) : utils.getTimestamp(year, month + 1, 1)

    const translationsQuery =
        "SELECT TRANSLATIONS.PK,TRANSLATIONS.STATUS,SUBPROJECT_ID,EMPLOYEE_ID,PROJECT_NUMBER,PAYONEER_STATUS,AMOUNT_CORRECTION_PERCENT,AMOUNT_CORRECTION,TRANSLATIONS.PAYMENT_METHOD,TRANSLATIONS.PRICE,SOURCE_WORDS,FIRST_NAME,LAST_NAME,RATE_TRANSLATION,RATE_PROOFREADING," +
        "WORDS_NO_MATCH,WORDS_FUZZY_MATCH,WORDS_REPS FROM TRANSLATIONS " +
        "JOIN SUBPROJECTS ON SUBPROJECT_ID = SUBPROJECTS.PK JOIN EMPLOYEES ON EMPLOYEE_ID = EMPLOYEES.PK " +
        "JOIN PROJECTS ON PROJECT_ID = PROJECTS.PK AND PROJECTS.STATUS IN (7, 8, 9) " +
        `AND DEADLINE >= ${fromTimestamp} AND DEADLINE < ${toTimestamp} AND TRANSLATIONS.STATUS IN (1, 2) AND PAYMENT_SHEET_ID = 0`

    const translationsArray = await db.getObjectsWithQuery(translationsQuery)

    const paymentSheetsQuery = "SELECT PK,MONTH,YEAR,PAYMENT_STATUS,EMPLOYEE_ID,EXTRA_AMOUNT,TEST_TRANSLATIONS_COUNT FROM PAYMENT_SHEETS WHERE PAYMENT_STATUS IN (0, 1)"
    const paymentSheetsArray = await db.getObjectsWithQuery(paymentSheetsQuery)

    translationsArray.forEach(translation => {
        // Get the payment sheet information stored for this translation's employee
        let sheet = employeesList[translation.EMPLOYEE_ID]
        // If it doesn't exist yet (it's the first translation for this employee), create it
        if (!sheet) {
            sheet = {
                translationIDs: [],
                paymentSheetsNotPaid: [],
                totalNotPaid: 0,
                amountCorrection: 0,
                negativeAmountCorrection: 0,
                projectsWithCorrection: "",
                comments: ""
                // The Hold Payments option for translators is not used anymore
                //  employeeIsOnHold: translation.PAYONEER_STATUS.includes("H")
            }
            employeesList[translation.EMPLOYEE_ID] = sheet
        }

        // Process the translation

        sheet.translationIDs.push(translation.PK)
        const price = getTranslationPrice(translation)

        if (translation.AMOUNT_CORRECTION_PERCENT != 0) {
            const correction = Math.round(price * translation.AMOUNT_CORRECTION_PERCENT) / 100
            sheet.amountCorrection += correction
            if (translation.AMOUNT_CORRECTION_PERCENT < 0) {
                sheet.projectsWithCorrection += `${translation.PROJECT_NUMBER}     ${translation.AMOUNT_CORRECTION_PERCENT * -1} %\n`
                sheet.negativeAmountCorrection += correction
            }
        } else if (translation.AMOUNT_CORRECTION != 0) {
            const correction = translation.AMOUNT_CORRECTION
            sheet.amountCorrection += correction
            if (translation.AMOUNT_CORRECTION < 0) {
                sheet.projectsWithCorrection += `${translation.PROJECT_NUMBER}     € ${translation.AMOUNT_CORRECTION * -1} %\n`
                sheet.negativeAmountCorrection += correction
            }
        }
    })

    // Process previous payment sheets that have not been paid. First find the old payment sheets that were not paid
    // for this employee and add them to the current sheet (if any) and add the sheet's EXTRA_AMOUNT to the amount not paid
    paymentSheetsArray.forEach(paymentSheet => {
        if (paymentSheet.MONTH == month && paymentSheet.YEAR == year) return

        // Check if the employee has a current payment sheet, otherwise return
        const sheet = employeesList[paymentSheet.EMPLOYEE_ID]
        if (!sheet) return

        // Add this old's payment sheet extra amount to the current payment sheet of the employee
        sheet.paymentSheetsNotPaid.push(paymentSheet.PK)
        sheet.totalNotPaid += paymentSheet.EXTRA_AMOUNT + paymentSheet.TEST_TRANSLATIONS_COUNT * 0.5

        // Add the comments about previous payment sheets not paid
        sheet.comments += `Correction for unpaid ${C_.shortMonthNames[paymentSheet.MONTH]} ${paymentSheet.YEAR}: ${
            paymentSheet.EXTRA_AMOUNT + paymentSheet.TEST_TRANSLATIONS_COUNT * 0.5
        } Euro\n`
    })

    // Add the translation's price to the current sheet's totalNotPaid if the translation was included
    // in a previous payment sheet which isn't paid (above)

    // First get the translations that were not paid
    const translationsNotPaidQuery =
        "SELECT TRANSLATIONS.STATUS,PAYMENT_SHEET_ID,SUBPROJECT_ID,TRANSLATIONS.EMPLOYEE_ID,PROJECT_NUMBER,PAYONEER_STATUS,AMOUNT_CORRECTION_PERCENT,TRANSLATIONS.PAYMENT_METHOD,TRANSLATIONS.PRICE,SOURCE_WORDS,FIRST_NAME,LAST_NAME,RATE_TRANSLATION,RATE_PROOFREADING," +
        "WORDS_NO_MATCH,WORDS_FUZZY_MATCH,WORDS_REPS FROM TRANSLATIONS " +
        "JOIN SUBPROJECTS ON SUBPROJECT_ID = SUBPROJECTS.PK JOIN EMPLOYEES ON EMPLOYEE_ID = EMPLOYEES.PK JOIN PROJECTS ON PROJECT_ID = PROJECTS.PK " +
        "JOIN PAYMENT_SHEETS ON PAYMENT_SHEET_ID = PAYMENT_SHEETS.PK AND PAYMENT_SHEETS.PAYMENT_STATUS IN (0, 1)"
    const translationsNotPaidArray = await db.getObjectsWithQuery(translationsNotPaidQuery)

    // Then process all the translations. Add the translation's price to the sheet's totalNotPaid amount
    translationsNotPaidArray.forEach(translation => {
        const sheet = employeesList[translation.EMPLOYEE_ID]
        if (sheet && sheet.paymentSheetsNotPaid.includes(translation.PAYMENT_SHEET_ID)) sheet.totalNotPaid += getTranslationPrice(translation)
    })

    let updatedTranslationsCount = 0
    let lastUpdatedTranslationsCount = 0

    // Create the payment sheets
    for (let [employeeID, sheet] of Object.entries(employeesList)) {
        await utils.delay(51)
        sheet.translationIDs.sort()
        sheet.totalNotPaid = utils.roundPrice(sheet.totalNotPaid)
        sheet.amountCorrection = utils.roundPrice(sheet.amountCorrection)
        const paymentSheet = {
            table: "PAYMENT_SHEETS",
            EMPLOYEE_ID: parseInt(employeeID, 10),
            MONTH: month,
            YEAR: year,
            EXTRA_AMOUNT: sheet.totalNotPaid + sheet.amountCorrection,
            PAYMENT_STATUS: 0,
            COMMENTS: sheet.comments,
            detailsToken: "X" // Will be added after the insert, as it requires the PK
        }
        // The Hold Payments option for translators is not used anymore
        // if (sheet.employeeIsOnHold) paymentSheet.PAYMENT_STATUS = 1 // pssOnHold

        if (!justLog)
            insertLocalObject(paymentSheet, async insertedPaymentSheet => {
                // Update all the translations to the new paymentSheetID IDs
                for (let translationID of sheet.translationIDs) {
                    await utils.delay(10)
                    sendLocalMessage("UPDATE_OBJECT", translationID, "TRANSLATIONS", "PAYMENT_SHEET_ID", insertedPaymentSheet.PK)
                    updatedTranslationsCount++
                }

                // Mark all the old payment sheets as paid
                sheet.paymentSheetsNotPaid.forEach(paymentSheetID => {
                    sendLocalMessage("UPDATE_OBJECT", paymentSheetID, "PAYMENT_SHEETS", "PAYMENT_STATUS", 3) // pssPaid
                })
            })

        // Send a message to all the employees that have an amount correction
        if (sheet.projectsWithCorrection) {
            const message =
                "Dear translator,\n\nThis message is to inform you that we had problems with some projects and that we have given a discount to the client. " +
                `We have deducted a total amount of € ${sheet.negativeAmountCorrection * -1} from your payment sheet for that. ` +
                `Below is a list of the projects that had problems and their related deduction percent or amount.\n\n${sheet.projectsWithCorrection}\n` +
                "Best regards,\nUniversal Translation Services"
            const employeeMessage = {
                table: "EMPLOYEES_MESSAGES",
                TO_ID: parseInt(employeeID, 10),
                FROM_ID: 238, // Anita's account ID
                MESSAGE: message
            }

            if (!justLog) insertLocalObject(employeeMessage)
        }
    }

    // Send the completed callback only if 1 second passes and we haven't updated any more translations
    // ie. we are done with updating the PAYMENT_SHEET_ID of all translations
    const interval = setInterval(() => {
        if (updatedTranslationsCount === lastUpdatedTranslationsCount && updatedTranslationsCount > 0) {
            // We are done, so we can send the completed message and clear the interval
            if (typeof completedCallback === "function") completedCallback()
            clearInterval(interval)
            return
        }
        lastUpdatedTranslationsCount = updatedTranslationsCount
    }, 1000)
}

async function savePaymentSheets(month, year, exchangeRate, shouldNotifyEmployeesWithProblems, callback, justLog) {
    console.log(`Saving payment sheets for ${month} / ${year} - rate: ${exchangeRate} - notify: ${shouldNotifyEmployeesWithProblems} ${justLog ? "- Just logging" : ""}`)

    const mainList = []
    const totalsList = []
    const manualList = []
    const payoneerEURList = []
    const payoneerUSDList = []
    const paypalList = []
    const commentsList = []
    const correctionsList = []
    const sheetAmounts = {}
    const sheetProjects = {}

    let bigTotal = 0
    let paypalTotal = 0
    let manualTotal = 0
    let payoneerEuroTotal = 0
    let payoneerUSDTotal = 0

    // Get the list of all the payment corrections
    const correctionsQuery = "SELECT FIRST_NAME,LAST_NAME FROM EMPLOYEES_PAYMENT_CORRECTIONS JOIN EMPLOYEES ON EMPLOYEE_ID = EMPLOYEES.PK AND IS_APPROVED = 0"
    const employeesPaymentCorrections = await db.getObjectsWithQuery(correctionsQuery)
    for (let correction of employeesPaymentCorrections) correctionsList.push(correction.FIRST_NAME + " " + correction.LAST_NAME)
    correctionsList.sort()
    correctionsList.unshift("The following translators have an amount correction added:\n")

    // Get the list of translations for the current month + the translations of payment sheets not paid
    const translationsQuery =
        "SELECT TRANSLATIONS.PK,TRANSLATIONS.STATUS,SUBPROJECT_ID,TRANSLATIONS.EMPLOYEE_ID,PROJECT_NUMBER,PAYONEER_STATUS,AMOUNT_CORRECTION_PERCENT,AMOUNT_CORRECTION,TRANSLATIONS.PAYMENT_METHOD,TRANSLATIONS.PRICE,SOURCE_WORDS,FIRST_NAME,LAST_NAME,RATE_TRANSLATION,RATE_PROOFREADING," +
        "WORDS_NO_MATCH,WORDS_FUZZY_MATCH,WORDS_REPS,PAYMENT_SHEET_ID FROM TRANSLATIONS " +
        "JOIN SUBPROJECTS ON SUBPROJECT_ID = SUBPROJECTS.PK JOIN EMPLOYEES ON EMPLOYEE_ID = EMPLOYEES.PK " +
        "JOIN PROJECTS ON PROJECT_ID = PROJECTS.PK " +
        "JOIN PAYMENT_SHEETS ON PAYMENT_SHEET_ID = PAYMENT_SHEETS.PK " +
        `AND PAYMENT_SHEET_ID > 0 AND ((MONTH = ${month} AND YEAR = ${year}) OR PAYMENT_STATUS <> 3)`
    const translations = await db.getObjectsWithQuery(translationsQuery)

    const statusStrings = ["Pending", "On hold", "Paid partially", "Paid"]
    const paymentMethodStrings = ["None", "Fixed price", "By source words", "", "By CAT analysis"]

    // Add the price of each translation to the total of that payment sheet
    for (let tr of translations) {
        let currentValue = sheetAmounts[tr.PAYMENT_SHEET_ID] || 0
        let translationPrice = getTranslationPrice(tr)
        sheetAmounts[tr.PAYMENT_SHEET_ID] = currentValue + translationPrice

        // Also add the list of projects to each sheet, so they can be added to the PDF
        if (!sheetProjects[tr.PAYMENT_SHEET_ID]) sheetProjects[tr.PAYMENT_SHEET_ID] = []
        sheetProjects[tr.PAYMENT_SHEET_ID].push({
            projectNumber: tr.PROJECT_NUMBER,
            PONumber: helper.translationPONumber(tr),
            price: `${settings("TRANSLATORS_CURRENCY_SYMBOL")} ${translationPrice.toFixed(2)}`,
            paymentMethod: paymentMethodStrings[tr.PAYMENT_METHOD]
        })
    }

    // Get all the payment sheets of this month + older payment sheets that are not paid
    const paymentSheetsQuery =
        "SELECT PAYMENT_SHEETS.PK,MONTH,YEAR,EXTRA_AMOUNT,TEST_TRANSLATIONS_COUNT,PAYMENT_METHOD,PAYMENT_STATUS,COUNTRY_ID,EMPLOYEE_ID,PAYONEER_STATUS,FIRST_NAME,LAST_NAME,PAYPAL_EMAIL FROM PAYMENT_SHEETS " +
        ` JOIN EMPLOYEES ON EMPLOYEE_ID = EMPLOYEES.PK AND ((MONTH = ${month} AND YEAR = ${year}) OR PAYMENT_STATUS <> 3)`
    const paymentSheets = await db.getObjectsWithQuery(paymentSheetsQuery)

    // Add the extra amounts to the total of that payment sheet
    for (let sheet of paymentSheets) {
        let currentValue = sheetAmounts[sheet.PK] || 0
        sheetAmounts[sheet.PK] = currentValue + sheet.EXTRA_AMOUNT + 0.5 * sheet.TEST_TRANSLATIONS_COUNT
    }

    // Prepare the folders where to save the files
    const uniqueID = utils.getUniqueID()
    const tempFolder = config.storeFolder + "Files/0B_REQUESTED_FILES/" + uniqueID
    utils.makeFolder(tempFolder)
    const folder = `${tempFolder}/Payments - ${C_.longMonthNames[month].slice(0, 3)} ${year}/`
    utils.makeFolder(folder)

    // Create a PDF document
    const doc = pdf.createDocument(`${folder}/Payments - ${C_.longMonthNames[month].slice(0, 3)} ${year}.pdf`)
    let isFirstPage = true

    // For each payment sheet, do the processing
    for (let sheet of paymentSheets) {
        if (sheet.MONTH != month || sheet.YEAR != year) continue
        if (sheet.PAYMENT_STATUS === 1) continue // pssOnHold

        const fullName = `${sheet.FIRST_NAME} ${sheet.LAST_NAME}`

        const statusString = statusStrings[sheet.PAYMENT_STATUS]

        let totalMonthsNotPaid = 0
        let totalAmount = sheetAmounts[sheet.PK] || 0

        // Go through all the payment sheets that were loaded (which includes older payment sheets that are not paid)
        // and add all the amounts of older payment sheets not paid for this employee to the totalMonthsNotPaid
        for (let otherSheet of paymentSheets)
            if (otherSheet.EMPLOYEE_ID === sheet.EMPLOYEE_ID && otherSheet.PK != sheet.PK && otherSheet.PAYMENT_STATUS != 3) totalMonthsNotPaid += sheetAmounts[otherSheet.PK] || 0

        bigTotal += totalAmount

        if (sheet.EMPLOYEE_COMMENTS) commentsList.push(`------- ${fullName}:\n\n${sheet.EMPLOYEE_COMMENTS}`)

        mainList.push(`${fullName}\t${totalAmount.toFixed(2)}`)

        if (totalAmount <= 0) {
            totalsList.push(`${fullName}\t${statusString}\t${totalAmount.toFixed(2)}\t<= 0 Euro\t${totalMonthsNotPaid > 0 ? totalMonthsNotPaid.toFixed(2) : ""}`)
            continue
        }

        let totalPriceString = "Total price: " + settings("TRANSLATORS_CURRENCY_SYMBOL") + " " + totalAmount.toFixed(2)
        if (sheet.EXTRA_AMOUNT > 0) totalPriceString += ` ( ${(totalAmount - sheet.EXTRA_AMOUNT).toFixed(2)} + ${sheet.EXTRA_AMOUNT.toFixed(2)} )`
        if (sheet.EXTRA_AMOUNT < 0) totalPriceString += ` ( ${(totalAmount - sheet.EXTRA_AMOUNT).toFixed(2)} ${sheet.EXTRA_AMOUNT.toFixed(2).replace("-", "- ")} )`

        // Add the sheet details to the PDF
        let count = 6
        let pageIndex = 1
        if (sheetProjects[sheet.PK]) {
            for (let tr of sheetProjects[sheet.PK]) {
                count++

                if (count === 7) {
                    // Only add a new page if it's not the first time we are doing this, as the PDF doc comes with a blank page
                    if (!isFirstPage) doc.addPage()
                    isFirstPage = false
                    doc.text(`Purchase orders for ${fullName} (page ${pageIndex})`, 10, 10)
                    doc.text("Payment sheet: " + C_.longMonthNames[month] + " " + year, 10, 15)
                    doc.fontSize(12).text(totalPriceString, 10, 20)
                    doc.fontSize(9)

                    doc.text("Project number", 10, 35)
                    doc.text("PO number", 60, 35)
                    doc.text("Job price", 100, 35)
                    doc.text("Payment method", 130, 35)
                }

                doc.text(tr.projectNumber, 10, count * 6)
                doc.text(tr.PONumber, 60, count * 6)
                doc.text(tr.price, 100, count * 6)
                doc.text(tr.paymentMethod, 130, count * 6)

                if (count > 45) {
                    count = 6
                    pageIndex++
                }
            }
        }

        let errorString = ""
        let paymentMethod = ""

        if (sheet.PAYMENT_METHOD === 1) {
            if ((sheet.PAYONEER_STATUS || "").includes("E")) {
                if (totalAmount > 19.99) {
                    const data = `${sheet.EMPLOYEE_ID},"${totalAmount.toFixed(2)}",EUR,${sheet.PK},"UTS Payment ${C_.longMonthNames[month]} ${year}","${utils.formatNow(
                        "M/D/YYYY"
                    )}"`
                    payoneerEURList.push(data)
                    payoneerEuroTotal += totalAmount
                    paymentMethod = "PayoneerEuro"
                } else errorString = "Amount too low for Payoneer Euro"
            } else errorString = "Payoneer Euro account not approved"
        }

        if (sheet.PAYMENT_METHOD === 2) {
            if ((sheet.PAYONEER_STATUS || "").includes("U")) {
                if (totalAmount > 19.99) {
                    const data = `${sheet.EMPLOYEE_ID},"${(totalAmount * exchangeRate).toFixed(2)}",USD,${sheet.PK},"UTS Payment ${
                        C_.longMonthNames[month]
                    } ${year}","${utils.formatNow("M/D/YYYY")}"`
                    payoneerUSDList.push(data)
                    payoneerUSDTotal += utils.roundPrice(totalAmount * exchangeRate)
                    paymentMethod = "PayoneerUSD"
                } else errorString = "Amount too low for Payoneer USD"
            } else errorString = "Payoneer USD account not approved"
        }

        if (sheet.PAYMENT_METHOD === 3) {
            if (utils.isValidEmail(sheet.PAYPAL_EMAIL)) {
                const paypalID = fullName.replace(/ /g, "_").replace(/\W/g, "").slice(0, 30)
                const data = `${sheet.PAYPAL_EMAIL}\t${totalAmount.toFixed(2).replace(".", ",")}\tEUR\t${paypalID}\t${C_.longMonthNames[month]}_${year}`
                paypalList.push(data)
                paypalTotal += totalAmount
                paymentMethod = "PayPal"
            } else errorString = `<${sheet.PAYPAL_EMAIL}> is not a valid PayPal address`
        }

        // This was for MoneyBookers, not used anymore
        // if (sheet.PAYMENT_METHOD === 4) {
        //     if (utils.isValidEmail(sheet.MONEYBOOKERS_EMAIL)) {
        //         const data = `${sheet.MONEYBOOKERS_EMAIL}\tEUR\t${totalAmount.toFixed(2)}\tEUR\t${C_.longMonthNames[month]}_${year}`
        //         moneyBList.push(data)
        //         // moneyBTotal += totalAmount
        //         paymentMethod = "MoneyBookers"
        //     } else errorString = `<${sheet.MONEYBOOKERS_EMAIL}> is not a valid MoneyBookers address`
        // }

        if (![1, 2, 3].includes(sheet.PAYMENT_METHOD)) errorString = "No payment method selected"

        if (errorString) {
            paymentMethod = "Manual"
            manualList.push(`${fullName}\t${totalAmount.toFixed(2)}`)
            manualTotal += totalAmount

            if (shouldNotifyEmployeesWithProblems && !errorString.includes("Amount too low")) {
                const message =
                    "Dear translator,\n\n" +
                    "While working on the payment sheets for this month, we have noticed that we can not make the payment to you because one of the following reasons:\n\n" +
                    "-  preferred payment method not set\n" +
                    "-  no payment details filled in\n" +
                    "-  possible not activated Payoneer account\n\n" +
                    "Please solve this as soon as possible and inform anita@universal-translation-services.com about the correct details and correct it also as soon as possible in Tranwise, so that we do not have the same problem with the next months payments.\n\n" +
                    "Also we would like to inform you that at this moment you can not be included into the automatic payment system, so a delay in your payment can be expected."
                const employeeMessage = {
                    table: "EMPLOYEES_MESSAGES",
                    TO_ID: sheet.EMPLOYEE_ID,
                    FROM_ID: 238, // Anita's account ID
                    MESSAGE: message
                }

                if (justLog) "Message to " + sheet.EMPLOYEE_ID + "\n" + message + "\n"
                if (!justLog) insertLocalObject(employeeMessage)
            }
        }
        totalsList.push(`${fullName}\t${statusString}\t${totalAmount.toFixed(2)}\t${paymentMethod}\t\t${errorString}`)
    }

    if (!paypalList.length) paypalList.push("There are no translators to be paid by PayPal.")
    if (!payoneerEURList.length) payoneerEURList.push("There are no translators to be paid by Payoneer Euro.")
    if (!payoneerUSDList.length) payoneerUSDList.push("There are no translators to be paid by Payoneer USD.")
    if (!manualList.length) manualList.push("There are no translators to be paid manually.")

    function saveListToFile(list, fileName) {
        return new Promise(resolve => {
            fs.writeFile(folder + `Payments - ${C_.longMonthNames[month].slice(0, 3)} ${year} - ${fileName}`, list.join("\r\n"), "ascii", err => {
                if (!err) resolve()
            })
        })
    }

    paypalList.sort((a, b) => a.localeCompare(b))
    manualList.sort((a, b) => a.localeCompare(b))

    await saveListToFile(paypalList, "PayPal.txt")
    await saveListToFile(payoneerEURList, "PayoneerEuro.csv")
    await saveListToFile(payoneerUSDList, "PayoneerUSD.csv")
    await saveListToFile(manualList, "Manual.xls")
    await saveListToFile(correctionsList, "Corrections.txt")

    totalsList.sort((a, b) => a.localeCompare(b))
    totalsList.unshift("\r\n\r\nNAME\tSTATUS\tAMOUNT (in EURO)\tPAYMENT TYPE")
    totalsList.unshift("Manual total\t" + manualTotal.toFixed(2) + " EUR")
    totalsList.unshift("Payoneer USD total\t" + payoneerUSDTotal.toFixed(2) + " USD\tExchange rate: " + exchangeRate)
    totalsList.unshift("Payoneer EUR total\t" + payoneerEuroTotal.toFixed(2) + " EUR")
    totalsList.unshift("Paypal total\t" + paypalTotal.toFixed(2) + " EUR")
    totalsList.unshift("Total to pay in " + C_.longMonthNames[month] + " " + year + "\t" + bigTotal.toFixed(2) + " EUR")
    await saveListToFile(totalsList, "Totals.xls")

    await doc.close() // Close the PDF document

    const zipFile = `${tempFolder}/Payments - ${C_.longMonthNames[month].slice(0, 3)} ${year}.zip`
    utils.zipFolder(folder, zipFile).then(() => {
        if (typeof callback === "function") callback(zipFile)
    })
}

async function saveTurnover(month, year, callback) {
    console.log(`Saving turnover for ${month} / ${year}`)

    const mainList = []
    const invoicesData = {}
    let bigTotal = 0

    mainList.push("CLIENT\tADDRESS\tINVOICE NUMBER\tDATE\tAMOUNT WITH VAT\tAMOUNT WITHOUT VAT\tVAT AMOUNT\tSTATUS\tPROJECT NUMBER\tDIVISION\tON HOLD\tREASON")

    // Get the list of all the invoices
    const invoicesQuery =
        "SELECT INVOICES.PK,INVOICE_NUMBER,INVOICE_DATE,IS_USA_SPECIAL,DIVISION,IS_MONTHLY,CLIENT_NAME,COUNTRY,ADDRESS,STATUS,HOLD_REMINDERS,INVOICES.COMMENTS FROM INVOICES JOIN CLIENTS ON CLIENT_ID = CLIENTS.PK " +
        `JOIN DIVISIONS ON DIVISION_ID = DIVISIONS.PK JOIN COUNTRIES ON COUNTRY_ID = COUNTRIES.PK AND MONTH(FROM_UNIXTIME(INVOICE_DATE-3600)) = ${month} AND YEAR(FROM_UNIXTIME(INVOICE_DATE-3600)) = ${year} ORDER BY INVOICES.PK`
    const invoices = await db.getObjectsWithQuery(invoicesQuery)

    for (let invoice of invoices) {
        invoicesData[invoice.PK] = {
            amountWithoutVAT: 0,
            amountWithVAT: 0,
            projects: []
        }
    }

    const projectsQuery =
        "SELECT INVOICE_ID,PROJECT_NUMBER,CALCULATED_PRICE,VAT_RATE FROM PROJECTS JOIN INVOICES ON INVOICE_ID = INVOICES.PK " +
        `AND MONTH(FROM_UNIXTIME(INVOICE_DATE-3600)) = ${month} AND YEAR(FROM_UNIXTIME(INVOICE_DATE-3600)) = ${year}`
    const projects = await db.getObjectsWithQuery(projectsQuery)

    // Add the price of each project to the total of that invoice
    for (let project of projects) {
        const data = invoicesData[project.INVOICE_ID]
        if (!data) continue
        data.amountWithoutVAT += project.CALCULATED_PRICE
        data.amountWithVAT += Math.round(project.CALCULATED_PRICE * (1 + project.VAT_RATE / 100) * 100) / 100
        data.projects.push(project.PROJECT_NUMBER)
    }

    function replaceReturnsAndTabs(str) {
        return (str || "").replace(/\r\n/g, " ").replace(/\n\r/g, " ").replace(/\r/g, " ").replace(/\n/g, " ").replace(/\t/g, " ")
    }

    for (let i of invoices) {
        const data = invoicesData[i.PK]
        if (!data) continue

        bigTotal += data.amountWithVAT
        let amountVAT = data.amountWithVAT - data.amountWithoutVAT
        if (amountVAT < 0.03) amountVAT = 0 // Because of the rounding, amountVAT sometimes is 0.01, when it should be 0

        let invoiceStatus = "Not paid"
        if (i.STATUS === 1) invoiceStatus = "Paid"
        if (i.STATUS === 2) invoiceStatus = "Won't be paid"

        const address = replaceReturnsAndTabs((i.ADDRESS || "").replace(/\r\n/g, ", "))
        const date = utils.formatDate(i.INVOICE_DATE, "D/M/YYYY")
        let str =
            `${i.CLIENT_NAME}\t${address}, ${i.COUNTRY}\t${invoiceNumber(i)}\t${date}\t${data.amountWithVAT.toFixed(2)}\t${data.amountWithoutVAT.toFixed(2)}\t${amountVAT.toFixed(
                2
            )}\t` + `${invoiceStatus}\t${data.projects.join(", ")}\t${i.DIVISION}`

        if (i.HOLD_REMINDERS) str += `\tYES\t${replaceReturnsAndTabs(i.COMMENTS)}`

        mainList.push(str)
    }

    mainList.unshift("")
    mainList.unshift("Total:\t" + bigTotal.toFixed(2))

    const fileName = `Turnover - ${C_.longMonthNames[month]} ${year}.xls`

    fs.writeFile(config.storeFolder + "Files/0B_REQUESTED_FILES/" + fileName, mainList.join("\n"), err => {
        if (err) return console.log(err)
        if (typeof callback === "function") callback(fileName)
    })
}

async function getPaymentSheetsHistory(callback) {
    const query = "SELECT DISTINCT MONTH, YEAR FROM PAYMENT_SHEETS ORDER BY YEAR DESC, MONTH DESC LIMIT 12"
    const results = await db.getObjectsWithQuery(query)
    callback(results)
}

async function getTurnoverAmountForMonth(month, year, callback) {
    let total = 0

    const projectsQuery =
        "SELECT INVOICE_ID,PROJECT_NUMBER,CALCULATED_PRICE,VAT_RATE FROM PROJECTS JOIN INVOICES ON INVOICE_ID = INVOICES.PK " +
        `AND MONTH(FROM_UNIXTIME(INVOICE_DATE-3600)) = ${month} AND YEAR(FROM_UNIXTIME(INVOICE_DATE-3600)) = ${year}`
    const projects = await db.getObjectsWithQuery(projectsQuery)

    for (let project of projects) total += project.CALCULATED_PRICE

    if (typeof callback === "function") callback(total)
}

async function markPaymentSheetsAsPaid(month, year, selectedPaymentMethod, completedCallback, justLog) {
    console.log(`Mark payment sheets paid for ${month} / ${year} / ${selectedPaymentMethod}`)

    // Get the translations for this month's payment sheets so we can calculate each payment sheet's total amount
    const translationsQuery =
        "SELECT TRANSLATIONS.STATUS,PAYMENT_SHEET_ID,SUBPROJECT_ID,TRANSLATIONS.EMPLOYEE_ID,PROJECT_NUMBER,PAYONEER_STATUS,AMOUNT_CORRECTION_PERCENT,TRANSLATIONS.PAYMENT_METHOD,TRANSLATIONS.PRICE,SOURCE_WORDS,FIRST_NAME,LAST_NAME,RATE_TRANSLATION,RATE_PROOFREADING," +
        "WORDS_NO_MATCH,WORDS_FUZZY_MATCH,WORDS_REPS FROM TRANSLATIONS " +
        "JOIN SUBPROJECTS ON SUBPROJECT_ID = SUBPROJECTS.PK JOIN EMPLOYEES ON EMPLOYEE_ID = EMPLOYEES.PK JOIN PROJECTS ON PROJECT_ID = PROJECTS.PK " +
        `JOIN PAYMENT_SHEETS ON PAYMENT_SHEET_ID = PAYMENT_SHEETS.PK AND MONTH = ${month} AND YEAR = ${year} AND PAYMENT_SHEETS.PAYMENT_STATUS = 0`
    const translations = await db.getObjectsWithQuery(translationsQuery)

    // Get all the payment sheets of this month
    const paymentSheetsQuery =
        "SELECT PAYMENT_SHEETS.PK,EXTRA_AMOUNT,TEST_TRANSLATIONS_COUNT,PAYMENT_METHOD,COUNTRY_ID,PAYONEER_STATUS,PAYPAL_EMAIL FROM PAYMENT_SHEETS " +
        ` JOIN EMPLOYEES ON EMPLOYEE_ID = EMPLOYEES.PK AND MONTH = ${month} AND YEAR = ${year} AND PAYMENT_STATUS = 0`
    const paymentSheets = await db.getObjectsWithQuery(paymentSheetsQuery)

    // Go through all the translations and calculate the total amount of each payment sheet (this doesn't include the EXTRA_AMOUNT, added later)
    const paymentSheetTranslationTotals = {}
    translations.forEach(translation => {
        let currentAmount = paymentSheetTranslationTotals[translation.PAYMENT_SHEET_ID] || 0
        paymentSheetTranslationTotals[translation.PAYMENT_SHEET_ID] = currentAmount + getTranslationPrice(translation)
    })

    // Go through all the payment sheets and mark as paid if needed
    for (let sheet of paymentSheets) {
        let amount = paymentSheetTranslationTotals[sheet.PK] || 0
        // Add the EXTRA_AMOUNT and the price of test translations
        amount += sheet.EXTRA_AMOUNT + sheet.TEST_TRANSLATIONS_COUNT * 0.5

        if (amount <= 0) continue
        if (sheet.COUNTRY_ID === 43) continue // skip employees from Canary Island

        let paymentMethod = ""

        if (sheet.PAYMENT_METHOD === 1 && sheet.PAYONEER_STATUS.includes("E") && amount >= 19.99) paymentMethod = "PayoneerEuro"
        if (sheet.PAYMENT_METHOD === 2 && sheet.PAYONEER_STATUS.includes("U") && amount >= 19.99) paymentMethod = "PayoneerUSD"
        if (sheet.PAYMENT_METHOD === 3 && utils.isValidEmail(sheet.PAYPAL_EMAIL)) paymentMethod = "PayPal"

        if (!paymentMethod) continue

        await utils.delay(10)

        if (selectedPaymentMethod === "All" || paymentMethod === selectedPaymentMethod) {
            if (!justLog) sendLocalMessage("UPDATE_OBJECT", sheet.PK, "PAYMENT_SHEETS", "PAYMENT_STATUS", 3) // pssPaid
        }
    }

    if (typeof completedCallback === "function") completedCallback()
}

function createMonthlyInvoices(month, year, completedCallback, justLog) {
    console.log(`Creating monthly invoices for ${month} ${year} ${justLog ? "- just logging" : ""}`)

    // This gets the last day of "month", due to the fact that JavaScript's months are 0..11, but we provide the month parameter as 1..12
    const invoiceDate = new Date(year, month, 0, 12)

    const invoices = {}

    const query =
        "SELECT PROJECTS.PK, DATE_COMPLETED, CLIENT_ID, DIVISION_ID, COUNTRY_ID FROM PROJECTS JOIN CLIENTS ON CLIENT_ID = CLIENTS.PK " +
        "AND IS_INVOICED_MONTHLY > 0 AND DATE_COMPLETED > 0 AND INVOICE_ID = 0 AND STATUS IN (8, 9) AND IS_TEST_TRANSLATION = 0 AND " +
        `MONTH(FROM_UNIXTIME(DATE_COMPLETED)) = ${month} AND YEAR(FROM_UNIXTIME(DATE_COMPLETED)) = ${year}`
    db.getObjectsWithQuery(query).then(async projects => {
        projects.forEach(project => {
            // For each project, check to see if we created an invoice for the project's client and reuse it. Otherwise make an invoice.
            let invoice = invoices[project.CLIENT_ID]
            if (!invoice) {
                invoice = {
                    table: "INVOICES",
                    CLIENT_ID: project.CLIENT_ID,
                    MONTH: month,
                    YEAR: year,
                    IS_MONTHLY: true,
                    STATUS: 0,
                    INVOICE_DATE: invoiceDate.getTime() / 1000,
                    IS_USA_SPECIAL: project.DIVISION_ID === 7 && project.COUNTRY_ID === 241 // UTS clients from the USA
                }
                invoices[project.CLIENT_ID] = { invoice, projectIDs: [] }
            }
            invoices[project.CLIENT_ID].projectIDs.push(project.PK)
        })

        if (justLog) return

        let count = 0

        // Create all the invoices
        for (let dataForClient of Object.values(invoices)) {
            await utils.delay(50)
            count++
            insertLocalObject(dataForClient.invoice, async insertedInvoice => {
                // Update all the projects to the new invoice IDs
                for (let projectID of dataForClient.projectIDs) {
                    await utils.delay(10)
                    sendLocalMessage("UPDATE_OBJECT", projectID, "PROJECTS", "INVOICE_ID", insertedInvoice.PK)
                }

                // Send the invoice after a little delay
                await utils.delay(30000 + 3000 * count)
                sendInvoice(insertedInvoice.PK)
            })
        }

        if (typeof completedCallback === "function") completedCallback()
    })
}

function invoiceNumber(invoice) {
    if (invoice.INVOICE_NUMBER) return invoice.INVOICE_NUMBER
    if (invoice.IS_USA_SPECIAL) return "007-" + invoice.PK.toString().padStart(5, "0")
    if (invoice.IS_MONTHLY) return "005-" + invoice.PK.toString().padStart(5, "0")
    return "003-" + invoice.PK.toString().padStart(5, "0")
}

function updateObject(pk, table, field, value) {
    sendLocalMessage("UPDATE_OBJECT", pk, table, field, value)
}

async function updateProjectPrice(project, subprojectIDToSkip, field, value) {
    // If the value received for project is a number, it means we got a projectID, not a project, so get the project from the database
    if (typeof project === "number") {
        // Wait for a little while to make sure the database is updated from the previous calls to PRICE, PAYMENT_CLIENT etc.
        await utils.delay(2000)
        project = await db.getObjectWithQuery(`SELECT * FROM PROJECTS WHERE PK = ${project}`)
    }

    if (!project) return
    if (field) project[field] = value

    const subprojects = await db.getObjectsWithQuery(`SELECT PK FROM SUBPROJECTS WHERE PROJECT_ID = ${project.PK}`)
    const subprojectsCount = subprojects.filter(s => s.PK != subprojectIDToSkip).length

    const totalPrice = helper.totalProjectPriceWithoutVAT(project, subprojectsCount)

    updateObject(project.PK, "PROJECTS", "CALCULATED_PRICE", totalPrice)
    if (project.IS_CERTIFIED && field != "PRICE") updateObject(project.PK, "PROJECTS", "PRICE", totalPrice)
}

async function updateProjectTagetWords(translation, newTargetWords) {
    const subproject = await db.getObjectWithQuery(`SELECT * FROM SUBPROJECTS WHERE PK = ${translation.SUBPROJECT_ID}`)
    if (!subproject) return log("ERROR", `updateProjectTagetWords: Subproject not found for SUBPROJECT_ID = ${translation.SUBPROJECT_ID}`)

    const project = await db.getObjectWithQuery(`SELECT * FROM PROJECTS WHERE PK = ${subproject.PROJECT_ID}`)
    if (!project) return log("ERROR", `updateProjectTagetWords: Project not found for PROJECT_ID = ${subproject.PROJECT_ID}`)

    // Only update the project's target words if the the translation is a proofreading or if it's a translation
    // and the project is translation-only
    if (translation.STATUS === C_.tsTranslating && project.PROJECT_TYPE != C_.ptTranslate) return

    const words = newTargetWords - translation.TARGET_WORDS
    const projectNewWords = project.TARGET_WORDS + words

    updateObject(project.PK, "PROJECTS", "TARGET_WORDS", projectNewWords)

    if (project.PAYMENT_CLIENT === C_.ptByTargetWords) {
        project.TARGET_WORDS = projectNewWords
        updateProjectPrice(project)
    }
}

async function postAffiliateDataForInvoice(invoice) {
    const client = await db.getObjectWithQuery(`SELECT * FROM CLIENTS WHERE PK = ${invoice.CLIENT_ID}`)
    if (!client) return log("ERROR", `postAffiliateDataForInvoice: Client not found for CLIENT_ID = ${invoice.CLIENT_ID}`)

    if (!client.AFFILIATE_ID.trim()) return

    const projects = await db.getObjectsWithQuery(`SELECT * FROM PROJECTS WHERE INVOICE_ID = ${invoice.PK}`)

    let totalPrice = 0
    projects.forEach(project => (totalPrice += helper.totalCalculatedProjectPrice(project)))

    sendHTTPPostRequestWithFormData(settings("AFFILIATE_INVOICE_PAID_POST_URL"), {
        secret: "5062bf9dbbffa",
        ap_id: client.AFFILIATE_ID,
        item_id: helper.invoiceNumber(invoice),
        sale_amt: totalPrice
    })
}

async function getProjectInformation(projectID) {
    const project = await db.getObjectWithQuery(`SELECT * FROM PROJECTS WHERE PK = ${projectID}`)
    if (!project) return log("ERROR", `getProjectInformation: Project not found for PK = ${projectID}`)

    const client = await db.getObjectWithQuery(`SELECT * FROM CLIENTS WHERE PK = ${project.CLIENT_ID}`)
    if (!client) return log("ERROR", `getProjectInformation: Client not found for PK = ${project.CLIENT_ID}`)

    const division = divisions[client.DIVISION_ID]
    if (!division) return log("ERROR", `getProjectInformation: Division not found for PK = ${client.DIVISION_ID}`)

    const subprojects = await db.getObjectsWithQuery(`SELECT * FROM SUBPROJECTS WHERE PROJECT_ID = ${projectID}`)
    let targetLanguages = "Target language" + utils.pluralS(subprojects.length) + ": "
    subprojects.forEach(subproject => (targetLanguages += languageWithID(subproject.LANGUAGE_ID) + ", "))
    targetLanguages = targetLanguages.slice(0, -2)

    return { project, client, division, subprojects, targetLanguages }
}

// !!! If you modify this function, make sure all the places where a project file is accessed (upload / download)
// will use the function. Search everywhere in the code for 01_PROJECTS_FILES
// PROJECTS_FILES are stored in subfolders like 00400000, 00410000, 00420000 based on their fileID
function projectFilePath(projectFile, fileID) {
    // We can get either a PROJECTS_FILES object
    if (typeof projectFile === "object") {
        const fileID = projectFile.PREFIX ? projectFile.PREFIX : projectFile.PK
        const subfolder = ("00000000" + fileID).slice(-8).slice(0, 4) + "0000/"
        return config.storeFolder + "Files/01_PROJECTS_FILES/" + subfolder + ("00000000" + fileID).slice(-8) + "_" + projectFile.FILE_NAME
    }

    // Or a file name plus the PK of the PROJECTS_FILES object
    if (typeof projectFile === "string") {
        const subfolder = ("00000000" + fileID).slice(-8).slice(0, 4) + "0000/"
        return config.storeFolder + "Files/01_PROJECTS_FILES/" + subfolder + ("00000000" + fileID).slice(-8) + "_" + projectFile
    }
}

async function sendTranslatedFileForOnlineEditing(projectFileID, isReminder, skipEmail) {
    const projectFile = await db.getObjectWithQuery(`SELECT * FROM PROJECTS_FILES WHERE PK = ${projectFileID}`)
    if (!projectFile) return log("ERROR", `sendTranslatedFileForOnlineEditing: Project file not found for PK = ${projectFileID}`)

    if (projectFile.FILE_TYPE != C_.pfFinal) return
    if (projectFile.CONTENTS != "NOT_NC") return

    const projectInfo = await getProjectInformation(projectFile.PROJECT_ID)
    if (!projectInfo) return

    const project = projectInfo.project

    if (!project.IS_NOTARIZED && !project.IS_CERTIFIED) return

    let emailType = "CHECK_FILE_IN_ONLINE_EDITOR"
    if (isReminder) {
        const now = utils.now()
        const uploadTime = projectFile.UPLOAD_TIME

        emailType = ""

        if (uploadTime > now - 3600 * 4 - 600 && uploadTime < now - 3600 * 4) emailType = "CHECK_FILE_IN_ONLINE_EDITOR"
        else if (uploadTime > now - 3600 * 20 - 600 && uploadTime < now - 3600 * 20) emailType = "CHECK_FILE_IN_ONLINE_EDITOR"

        if (emailType === "" || projectFile.CLIENT_APPROVAL_STATUS != 1) return
    }

    // ONLINE_EDITOR_LINK is set to "LINK" when the file should be sent to the client, so we need to get the editor link first
    if (projectFile.ONLINE_EDITOR_LINK === "LINK") {
        const filePath = projectFilePath(projectFile)

        // If the file doesn't exist on the server, wait for a little while to allow it to be copied from the temp folder
        if (!(await utils.fileExists(filePath))) await utils.delay(5000)

        if (!(await utils.fileExists(filePath))) return log("ERROR", `sendTranslatedFileForOnlineEditing: File doesn't exist for PK = ${projectFileID}, path = ${filePath}`, true)

        const tempFolderUniqueID = utils.getUniqueID()
        utils.makeFolder("C:/websites/deliver.tranwise.com/onlineeditorfiles/" + tempFolderUniqueID)
        const finalPath = "C:/websites/deliver.tranwise.com/onlineeditorfiles/" + tempFolderUniqueID + "/" + projectFile.FILE_NAME
        if (!(await utils.copyFile(filePath, finalPath)))
            return log("ERROR", `sendTranslatedFileForOnlineEditing: Couldn't copy file from "${filePath}" to "${finalPath}" for PK = ${projectFileID}`)

        const fileNameForLink = utils.encodeURI(projectFile.FILE_NAME)
        if (!fileNameForLink) return log("ERROR", `sendTranslatedFileForOnlineEditing: Filename could not be encoded "${projectFile.FILE_NAME}" for PK = ${projectFileID}`)

        const fileLink = "https://deliver.tranwise.com/onlineeditorfiles/" + tempFolderUniqueID + "/" + fileNameForLink
        const response = await sendHTTPPostRequestWithObject(settings("ONLINE_EDITOR_REQUEST_URL"), {
            projectID: `${project.PK}`,
            fileID: `${projectFile.PK}`,
            filePath: fileLink
        })

        if (!response || response.error || typeof response.fileUrl != "string" || !response.fileUrl.includes("office-editor")) {
            // If we got an error, send the file using the old method
            updateObject(projectFile.PK, "PROJECTS_FILES", "ONLINE_EDITOR_LINK", "")
            sendTranslatedFileForCheck(projectFileID, isReminder, true)
            return
        }

        updateObject(projectFile.PK, "PROJECTS_FILES", "ONLINE_EDITOR_LINK", response.fileUrl)
        projectFile.ONLINE_EDITOR_LINK = response.fileUrl
    }

    if (skipEmail) return

    sendTemplateEmail(emailType, projectInfo.division, projectInfo.division.EMAIL, project.PROJECT_EMAIL, {
        project_number: project.PROJECT_NUMBER,
        online_editor_link: projectFile.ONLINE_EDITOR_LINK
    })

    updateObject(projectFile.PK, "PROJECTS_FILES", "CLIENT_APPROVAL_STATUS", C_.casWaitingApproval)
}

async function sendTranslatedFileForCheck(projectFileID, isReminder, forceOldMethod, skipEmail) {
    const projectFile = await db.getObjectWithQuery(`SELECT * FROM PROJECTS_FILES WHERE PK = ${projectFileID}`)
    if (!projectFile) return log("ERROR", `performSendTranslatedFileForCheck: Project file not found for PK = ${projectFileID}`)

    if (projectFile.FILE_TYPE != C_.pfFinal) return
    if (projectFile.CONTENTS != "NOT_NC") return

    const projectInfo = await getProjectInformation(projectFile.PROJECT_ID)
    if (!projectInfo) return

    const project = projectInfo.project

    if (projectFile.ONLINE_EDITOR_LINK && settings("ONLINE_EDITOR_REQUEST_URL") && !forceOldMethod && !project.TWILIO_STATUS) {
        sendTranslatedFileForOnlineEditing(projectFile.PK, isReminder, skipEmail)
        return
    }

    if (!project.IS_NOTARIZED && !project.IS_CERTIFIED) return

    let emailType = "CHECK_NOTARIZED_TRANSLATION"
    if (isReminder) {
        const now = utils.now()
        const uploadTime = projectFile.UPLOAD_TIME

        emailType = ""

        if (uploadTime > now - 3600 * 4 - 600 && uploadTime < now - 3600 * 4) emailType = "CHECK_NOTARIZED_TRANSLATION_REMINDER_1"
        else if (uploadTime > now - 3600 * 20 - 600 && uploadTime < now - 3600 * 20) emailType = "CHECK_NOTARIZED_TRANSLATION_REMINDER_3"

        if (emailType === "" || projectFile.CLIENT_APPROVAL_STATUS != 1) return
    }

    const filePath = projectFilePath(projectFile)

    // If the file doesn't exist on the server, wait for a little while to allow it to be copied from the temp folder
    if (!(await utils.fileExists(filePath))) await utils.delay(5000)

    if (!(await utils.fileExists(filePath))) return log("ERROR", `performSendTranslatedFileForCheck: File doesn't exist for PK = ${projectFileID}, path = ${filePath}`)

    const approvalLink = "http://www.tranwiseweb.com/approveTranslation.php?id=" + projectFile.PK + "&code=" + utils.md5(projectFile.PK + "TranwiseWebAPIKey")
    const commentsLink = "http://www.tranwiseweb.com/sendTranslationComments.php?id=" + projectFile.PK + "&code=" + utils.md5(projectFile.PK + "TranwiseWebAPIKey")

    const tempFolderUniqueID = utils.getUniqueID()
    if (project.TWILIO_STATUS > 0) {
        const fileLink = "https://deliver.tranwise.com/deliver/" + tempFolderUniqueID + "/" + projectFile.FILE_NAME.replace(/ /g, "%20").replace(/#/g, "%23")
        const finalPath = "C:/websites/deliver.tranwise.com/deliver/" + tempFolderUniqueID + "/" + projectFile.FILE_NAME
        utils.makeFolder("C:/websites/deliver.tranwise.com/deliver/" + tempFolderUniqueID)

        if (!(await utils.copyFile(filePath, finalPath)))
            return log("ERROR", `performSendTranslatedFileForCheck: Couldn't copy file from "${filePath}" to "${finalPath}" for PK = ${projectFileID}`)

        let phoneNumber = (projectInfo.client.PHONE_NUMBERS || "").split("\r\n")[0]
        sendTwilioSMSWithTemplate("TWILIO_SMS_CHECK_NOTARIZED_TRANSLATION", phoneNumber, {
            project_number: project.PROJECT_NUMBER,
            approval_link: approvalLink,
            file_link: fileLink,
            notarized_and_certified: helper.projectNCText(project),
            IS_WHATSAPP: project.TWILIO_STATUS === 2 ? 1 : 0
        })
    } else {
        const tempFolder = config.storeFolder + "Files/TEMP/" + tempFolderUniqueID
        utils.makeFolder(tempFolder)
        const attachmentPath = tempFolder + "/" + projectFile.FILE_NAME
        if (!(await utils.copyFile(filePath, attachmentPath)))
            return log("ERROR", `performSendTranslatedFileForCheck: Couldn't copy file from "${filePath}" to "${attachmentPath}" for PK = ${projectFileID}`)

        sendTemplateEmail(
            emailType,
            projectInfo.division,
            projectInfo.division.EMAIL,
            project.PROJECT_EMAIL,
            {
                project_number: project.PROJECT_NUMBER,
                approval_link: approvalLink,
                comments_link: commentsLink,
                notarized_and_certified: helper.projectNCText(project)
            },
            attachmentPath
        )

        updateObject(projectFile.PK, "PROJECTS_FILES", "CLIENT_APPROVAL_STATUS", C_.casWaitingApproval)
    }
}

async function sendProjectFinalFile(projectFileID, emailAddress) {
    const projectFile = await db.getObjectWithQuery(`SELECT * FROM PROJECTS_FILES WHERE PK = ${projectFileID}`)
    if (!projectFile) return log("ERROR", `sendFinalFile: Project file not found for PK = ${projectFileID}`)

    const projectInfo = await getProjectInformation(projectFile.PROJECT_ID)
    if (!projectInfo) return

    const project = projectInfo.project

    if (project.NEEDS_QA_REPORT && projectFile.CONTENTS != "QA") {
        sendEmail(
            settings("SYSTEM_EMAIL"),
            settings("GENERAL_MANAGER_EMAIL"),
            `Tranwise: Project ${project.PROJECT_NUMBER} -- a file was sent without the QA report`,
            `Project ${project.PROJECT_NUMBER}\n\nFile "${projectFile.FILE_NAME}" was sent to the client without the QA report.`
        )
    }

    const filePath = projectFilePath(projectFile)
    if (!(await utils.fileExists(filePath))) return log("ERROR", `sendFinalFile: File doesn't exist for PK = ${projectFileID}, path = ${filePath}`)

    const division = projectInfo.division
    const satisfactionString = division.SATISFACTION_LINK
        ? `Please note that we care about our business and that we would like to have your feedback about our translations and services. Feel free to give us your opinion by going to the following link:\n\n${division.SATISFACTION_LINK}\n\n`
        : ""

    const satisfactionStringHTML = division.SATISFACTION_LINK
        ? `Please note that we care about our business and that we would like to have your feedback about our translations and services. Feel free to give us your opinion by going to the following link: <br /><br /><a href="${division.SATISFACTION_LINK}">${division.SATISFACTION_LINK}</a><br /><br />`
        : ""

    const shouldSendByTwilio = project.TWILIO_STATUS > 0 
    const shouldSendByEmail = emailAddress !== settings("EMAIL_FOR_TWILIO_PROJECTS")

    const stats = fs.statSync(filePath)
    const emailType = stats.size > 2000000 || shouldSendByTwilio ? "FINAL_FILE_AS_LINK" : "FINAL_FILE_AS_ATTACHMENT"

    let fileLink = ""
    let attachmentPath = ""

    const tempFolderUniqueID = utils.getUniqueID()

    if (emailType === "FINAL_FILE_AS_ATTACHMENT") {
        const tempFolder = config.storeFolder + "Files/TEMP/" + tempFolderUniqueID
        utils.makeFolder(tempFolder)
        attachmentPath = tempFolder + "/" + projectFile.FILE_NAME
        if (!(await utils.copyFile(filePath, attachmentPath)))
            return log("ERROR", `sendFinalFile: Couldn't copy file from "${filePath}" to "${attachmentPath}" for PK = ${projectFileID}`)
    } else {
        fileLink = "https://deliver.tranwise.com/deliver/" + tempFolderUniqueID + "/" + projectFile.FILE_NAME.replace(/ /g, "%20").replace(/#/g, "%23")
        utils.makeFolder("C:/websites/deliver.tranwise.com/deliver/" + tempFolderUniqueID)
        const finalPath = "C:/websites/deliver.tranwise.com/deliver/" + tempFolderUniqueID + "/" + projectFile.FILE_NAME
        if (!(await utils.copyFile(filePath, finalPath))) return log("ERROR", `sendFinalFile: Couldn't copy file from "${filePath}" to "${finalPath}" for PK = ${projectFileID}`)
    }

    if (shouldSendByTwilio) {
        let phoneNumber = (projectInfo.client.PHONE_NUMBERS || "").split("\r\n")[0]
        sendTwilioSMSWithTemplate("TWILIO_SMS_FINAL_FILE", phoneNumber, {
            project_number: project.PROJECT_NUMBER,
            file_link: fileLink,
            target_languages: projectInfo.targetLanguages.replace(/Target languages*: /g, ""),
            source_language: languageWithID(project.SOURCE_LANGUAGE_ID),
            IS_WHATSAPP: project.TWILIO_STATUS === 2 ? 1 : 0
        })
    } 
    if (shouldSendByEmail) {
        sendTemplateEmail(
            emailType,
            division,
            division.EMAIL,
            emailAddress,
            {
                project_number: project.PROJECT_NUMBER,
                client_order_number: project.CLIENT_ORDER_NUMBER,
                file_link: fileLink,
                satisfaction_link: satisfactionString,
                satisfaction_link_html: satisfactionStringHTML,
                link_for_tranwiseweb: linkForPortal(project.CLIENT_ID)
            },
            attachmentPath
        )
    }

    const newFileType = [C_.pfReopenedFinal, C_.pfReopenedFinalSent].includes(projectFile.FILE_TYPE) ? C_.pfReopenedFinalSent : C_.pfFinalSent
    updateObject(projectFile.PK, "PROJECTS_FILES", "FILE_TYPE", newFileType)
}

async function sendProjectReopenedFile(projectFileID, emailAddress) {
    const projectFile = await db.getObjectWithQuery(`SELECT * FROM PROJECTS_FILES WHERE PK = ${projectFileID}`)
    if (!projectFile) return log("ERROR", `sendProjectReopenedFile: Project file not found for PK = ${projectFileID}`)

    const projectInfo = await getProjectInformation(projectFile.PROJECT_ID)
    if (!projectInfo) return

    const project = projectInfo.project
    const division = projectInfo.division

    const filePath = projectFilePath(projectFile)
    if (!(await utils.fileExists(filePath))) return log("ERROR", `sendProjectReopenedFile: File doesn't exist for PK = ${projectFileID}, path = ${filePath}`)

    let attachmentPath = ""
    const tempFolderUniqueID = utils.getUniqueID()
    const tempFolder = config.storeFolder + "Files/TEMP/" + tempFolderUniqueID
    utils.makeFolder(tempFolder)
    attachmentPath = tempFolder + "/" + projectFile.FILE_NAME
    if (!(await utils.copyFile(filePath, attachmentPath)))
        return log("ERROR", `sendProjectReopenedFile: Couldn't copy file from "${filePath}" to "${attachmentPath}" for PK = ${projectFileID}`)

    sendTemplateEmail(
        "REOPENED_PROJECT_FILE",
        division,
        division.EMAIL,
        emailAddress,
        {
            project_number: project.PROJECT_NUMBER,
            client_order_number: project.CLIENT_ORDER_NUMBER,
            reopen_comments: project.REOPEN_RESPONSE,
            link_for_tranwiseweb: linkForPortal(project.CLIENT_ID)
        },
        attachmentPath
    )

    const newFileType = [C_.pfReopenedFinal, C_.pfReopenedFinalSent].includes(projectFile.FILE_TYPE) ? C_.pfReopenedFinalSent : C_.pfFinalSent
    updateObject(projectFile.PK, "PROJECTS_FILES", "FILE_TYPE", newFileType)
}

async function performUpdateActions(existingObject, pk, table, field, value) {
    // The existingObject is the object as loaded from the database before the update
    // If we got an undefined object somehow, make it a blank object so we don't crash the server in the tests below
    if (!existingObject) existingObject = {}

    if (table === "EMPLOYEES") {
        if (field === "EMPLOYEE_TYPE" && [C_.etDisabled, C_.etPending].includes(value)) {
            // Mark any connections for this employee as disabled
            socketManager.disableUser(pk)
        }

        if (field === "EMPLOYEE_TYPE" && existingObject && existingObject.EMPLOYEE_TYPE === C_.etPending && value === C_.etTranslator) {
            sendTemplateEmail("TRANSLATOR_ACCEPTED", null, settings("RECRUITMENT_EMAIL"), existingObject.EMAIL)
            updateObject(pk, "EMPLOYEES", "ACCEPTED_DATE", utils.now())
            subscribeToMailChimp(
                existingObject.EMAIL,
                existingObject.FIRST_NAME + " " + existingObject.LAST_NAME,
                settings("MAILCHIMP_APIKEY_UTSTranslators"),
                settings("MAILCHIMP_LIST_ID_UTSFreefixedTranslators")
            )
        }

        if (field === "EMPLOYEE_TYPE" && existingObject && existingObject.EMPLOYEE_TYPE === C_.etTranslator && value === C_.etDisabled) {
            subscribeToMailChimp(
                existingObject.EMAIL,
                existingObject.FIRST_NAME + " " + existingObject.LAST_NAME,
                settings("MAILCHIMP_APIKEY_UTSTranslators"),
                settings("MAILCHIMP_LIST_ID_UTSFreefixedTranslators"),
                true // true means unsubscribe
            )
        }
    }

    if (table === "PROJECTS") {
        if (field === "STATUS" && value === C_.psSetup && !existingObject.TEMPLATE_EDITOR_LINK && existingObject.WEBSITE_ORDER_ID) {
            const url = `http://translation-editor.tranwise.com/docs/cloned/${existingObject.WEBSITE_ORDER_ID.replace("_", "/")}`
            const response = await sendHTTPGetRequest(url)
            if (!response.error && response.content && response.content.editorUrl) updateObject(pk, "PROJECTS", "TEMPLATE_EDITOR_LINK", response.content.editorUrl)
            else log("ERROR", `Template editor: Bad response from ${url}: ${response.error || response}`)
        }

        // Get the project data (including subprojects) and forward it to the translators
        if (field === "STATUS" && value === C_.psPending) {
            const projectData = await getNewProjectDataForTranslators(pk, true)
            projectData.STATUS = C_.psPending
            forwardMessage("NEW_PROJECT", projectData)

            for (let subproject of projectData.subprojects) {
                sendEmailsAboutSubproject(subproject)
                sendTelegramsAboutSubproject(subproject)
            }
        }

        if (field === "STATUS" && [C_.psTranslation, C_.psProofreading, C_.psCheckPhase].includes(value)) {
            const project = existingObject
            if (!project.IN_PROGRESS_INFO_SENT && !project.TWILIO_STATUS && !project.VIDEO_INTERPRETING_STATUS && !project.WEBSITE_ORDER_ID) {
                if ([C_.ppsPrepaymentPending, C_.ppsPrepaymentDone].includes(project.PREPAYMENT_STATUS)) sendEmailWithTypeForProject("PROJECT_IN_PROGRESS_PREPAYMENT", pk)
                else sendEmailWithTypeForProject("PROJECT_IN_PROGRESS", pk)
            }
        }

        if (field === "STATUS" && value === C_.psCompleted && existingObject.DIGITAL_CERTIFICATION_STATUS === 1) {
            const text = "Tranwise: Project " + existingObject.PROJECT_NUMBER + " was completed and requires digital certification"
            sendEmail(settings("SYSTEM_EMAIL"), settings("GENERAL_MANAGER_EMAIL"), text, text)
        }

        if (field === "STATUS" && value === C_.psReopened) {
            sendEmailWithTypeForProject("REOPENED_PROJECT", pk)
        }

        /* prettier-ignore */
        if (["PRICE", "PAYMENT_CLIENT", "SOURCE_WORDS", "RATE_NO_MATCH", "RATE_FUZZY_MATCH", "RATE_REPS", "WORDS_NO_MATCH", "WORDS_FUZZY_MATCH", "WORDS_REPS",
            "EXTRA_COSTS", "INITIAL_SERVICES_COST", "SHIPPING_COST", "PAGES_COUNT", "CERTIFIED_PRICE_PER_PAGE", "CERTIFIED_PRICE_PER_WORD", "PRINT_COPIES_COUNT",
            "PRICE_PER_PRINT_COPY", "CERTIFIED_PAYMENT_METHOD", "CERTIFIED_BASE_PRICE"].includes(field)) {
            existingObject[field] = value
            updateProjectPrice(existingObject, 0, field, value)
        }

        // If the prepayment status is set by a project manager (it doesn't come from TranwiseWeb), inform the general manager
        if (field === "PREPAYMENT_STATUS" && value === C_.ppsPrepaymentDone && this.isManager) {
            const text = "Tranwise: Prepaid project " + existingObject.PROJECT_NUMBER + " was set on paid manually"
            sendEmail(settings("SYSTEM_EMAIL"), settings("GENERAL_MANAGER_EMAIL"), text, text)
        }

        // If the prepayment status comes from TranwiseWeb, send a confirmation email to the client
        if (field === "PREPAYMENT_STATUS" && value === C_.ppsPrepaymentDone && !this.isManager) {
            sendEmailWithTypeForProject("PROJECT_PREPAYMENT_RECEIVED", pk)
        }

        if (field === "DEADLINE" && [C_.psTranslation, C_.psProofreading, C_.psCheckPhase].includes(existingObject.STATUS)) {
            const subject = "Tranwise: Project in progress " + existingObject.PROJECT_NUMBER + " had the deadline changed"
            const text =
                `Project in progress ${existingObject.PROJECT_NUMBER} had the deadline changed from ${utils.formatDate(existingObject.DEADLINE)} to ${utils.formatDate(value)}. ` +
                `Comments:\n\n${existingObject.DEADLINE_COMMENTS || ""}`
            sendEmail(settings("SYSTEM_EMAIL"), settings("GENERAL_MANAGER_EMAIL"), subject, text)
        }

        if (
            field === "DEADLINE_INTERMEDIATE" &&
            [C_.psTranslation, C_.psProofreading, C_.psCheckPhase].includes(existingObject.STATUS) &&
            existingObject.DEADLINE_INTERMEDIATE &&
            existingObject.DEADLINE_INTERMEDIATE != value
        ) {
            const subject = "Tranwise: Project in progress " + existingObject.PROJECT_NUMBER + " had the intermediate deadline changed"
            const text = `Project in progress ${existingObject.PROJECT_NUMBER} had the intermediate deadline changed from ${utils.formatDate(
                existingObject.DEADLINE
            )} to ${utils.formatDate(value)}.`
            sendEmail(settings("SYSTEM_EMAIL"), settings("GENERAL_MANAGER_EMAIL"), subject, text)
        }

        if (field === "IS_ON_HOLD") {
            const subprojects = await db.getObjectsWithQuery(`SELECT * FROM SUBPROJECTS WHERE PROJECT_ID = ${db.escape(pk)}`)
            if (!subprojects.length) return

            const subprojectsPKs = subprojects.map(subproject => subproject.PK).join(",")
            const translations = await db.getObjectsWithQuery(
                `SELECT PK, SUBPROJECT_ID, EMPLOYEE_ID FROM TRANSLATIONS WHERE STATUS IN (${C_.tsTranslating}, ${C_.tsProofreading}) AND SUBPROJECT_ID IN (${subprojectsPKs})`
            )

            const project = existingObject
            const message = value
                ? "Project " + project.PROJECT_NUMBER + " has been put on hold. Please do not work on it anymore, until you receive further instructions."
                : "Project " + project.PROJECT_NUMBER + " is back in progress (it is not on hold anymore). You may start working on it."

            for (let translation of translations) {
                const projectMessage = {
                    table: "PROJECTS_MESSAGES",
                    PROJECT_ID: project.PK,
                    SUBPROJECT_ID: translation.SUBPROJECT_ID,
                    TRANSLATION_ID: translation.PK,
                    SENDER: "MT",
                    RECIPIENT: translation.EMPLOYEE_ID,
                    MESSAGE: message,
                    IS_PROBLEM: true,
                    metadata: {
                        PROJECT_NUMBER: project.PROJECT_NUMBER
                    }
                }

                insertLocalObject(projectMessage)
            }
        }

        if (field === "WORKING_MANAGER_ID" && value) {
            const projectHistory = {
                table: "PROJECTS_HISTORY",
                PROJECT_ID: pk,
                ACTION: C_.phWorkOnDelivery,
                DETAILS: "",
                overrideEmployeeID: value
            }
            insertLocalObject(projectHistory)
        }

        if (field === "INVOICE_ID") {
            const project = existingObject

            const invoice = await db.getObjectWithQuery(`SELECT * FROM INVOICES WHERE PK = ${value}`)
            if (!invoice) return log("ERROR", "performUpdateAction: PROJECTS.INVOICE_ID - invoice is undefined for PK = " + value)
            if (invoice.IS_MONTHLY) return

            const client = await db.getObjectWithQuery(`SELECT * FROM CLIENTS WHERE PK = ${invoice.CLIENT_ID}`)
            if (!client) return log("ERROR", "performUpdateAction: PROJECTS.INVOICE_ID - invoice is undefined for CLIENT_ID = " + invoice.CLIENT_ID)

            if (client.IS_INVOICED_BY_POST) {
                const info = await createPDFInvoice(invoice.PK, client.PK)
                if (!info) return log("ERROR", "performUpdateAction: PROJECTS.INVOICE_ID - Error when creating PDF invoice")

                const subject = "Tranwise: Invoice " + helper.invoiceNumber(invoice) + " should be sent by post"
                const text =
                    `Tranwise: Invoice ${helper.invoiceNumber(invoice)} should be sent by post. The client's details are:\n\n` +
                    `${client.CLIENT_NAME}\n\n${client.ADDRESS}\n${(countries[client.COUNTRY_ID] || { COUNTRY: "" }).COUNTRY}`
                sendEmail(settings("SYSTEM_EMAIL"), settings("GENERAL_MANAGER_EMAIL"), subject, text, info.documentPath)
            } else {
                if (client.IS_INVOICED_ONLINE) {
                    const subject = `Tranwise: New invoice to be uploaded online ${helper.invoiceNumber(invoice)}`
                    const text =
                        "A new invoice has been created for a client that needs it uploaded online. Please upload the invoice to the clients online system. Invoice number: " +
                        helper.invoiceNumber(invoice)
                    sendEmail(settings("SYSTEM_EMAIL"), settings("ACCOUNTING_EMAIL"), subject, text)
                }

                const isFullyPrepaid = (project.PREPAYMENT_STATUS === C_.ppsPrepaymentDone && project.REQUIRED_PREPAYMENT_PERCENT === 100) || project.PREPAID_INVOICE_NUMBER
                if (!project.TWILIO_STATUS) sendInvoice(invoice.PK, "", "", isFullyPrepaid)
            }

            if (invoice.STATUS === C_.isPaid && client.AFFILIATE_ID.trim()) postAffiliateDataForInvoice(invoice)

            if (project.REQUIRED_PREPAYMENT_PERCENT > 0 && project.REQUIRED_PREPAYMENT_PERCENT < 100) {
                const subject = "Tranwise: Partially paid invoice " + helper.invoiceNumber(invoice)
                const text = `Invoice ${helper.invoiceNumber(invoice)} was created for project ${project.PROJECT_NUMBER}, which requires a prepayment of ${
                    project.REQUIRED_PREPAYMENT_PERCENT
                }% ( ${(project.CALCULATED_PRICE * project.REQUIRED_PREPAYMENT_PERCENT) / 100} ${project.CURRENCY} ). Client name: ${client.CLIENT_NAME}`
                sendEmail(settings("SYSTEM_EMAIL"), settings("ACCOUNTING_EMAIL"), subject, text)
            }
        }
    }

    if (table === "SUBPROJECTS") {
        // If the message is an update to ALLOW_PROOFREADERS_SPECIAL or INTERMEDIATE_LANGUAGE_ID, get the project data
        // and forward it to the translators
        if ((field === "ALLOW_PROOFREADERS_SPECIAL" && value === true) || field === "INTERMEDIATE_LANGUAGE_ID") {
            // First get the subproject, so we can get the project based on the subproject.PROJECT_ID
            const subproject = await getObjectDetails(pk, table)
            if (subproject && subproject.PROJECT_ID) {
                // Set the received values to the object, as the request from the database might not be up to date yet (because of Tranwise 2 integration)
                if (field === "ALLOW_PROOFREADERS_SPECIAL") subproject.ALLOW_PROOFREADERS_SPECIAL = value
                if (field === "INTERMEDIATE_LANGUAGE_ID") subproject.INTERMEDIATE_LANGUAGE_ID = value

                const projectData = await getNewProjectDataForTranslators(subproject.PROJECT_ID, false)
                const statuses = [C_.psPending, C_.psTranslation, C_.psProofreading, C_.psCheckPhase, C_.psReopened]
                if (projectData && statuses.includes(projectData.STATUS)) {
                    projectData.subprojects = [subproject]
                    forwardMessage("NEW_PROJECT", projectData)
                }
            }
        }
    }

    if (table === "TRANSLATIONS") {
        if (field === "TARGET_WORDS") updateProjectTagetWords(existingObject, value)

        if (field === "STATUS" && [C_.tsTranslating, C_.tsProofreading].includes(value) && existingObject) {
            const subproject = await db.getObjectWithQuery(`SELECT * FROM SUBPROJECTS WHERE PK = ${existingObject.SUBPROJECT_ID}`)
            if (!subproject) return log("ERROR", "performUpdateAction: TRANSLATIONS.STATUS - subproject is undefined for SUBPROJECT_ID = " + existingObject.SUBPROJECT_ID)
            const project = await db.getObjectWithQuery(`SELECT * FROM PROJECTS WHERE PK = ${subproject.PROJECT_ID}`)
            if (!project) return log("ERROR", "performUpdateAction: TRANSLATIONS.STATUS - project is undefined for PROJECT_ID = " + subproject.PROJECT_ID)
            const employee = await db.getObjectWithQuery(`SELECT * FROM EMPLOYEES WHERE PK = ${existingObject.EMPLOYEE_ID}`)
            if (!employee) return log("ERROR", "performUpdateAction: TRANSLATIONS.STATUS - employee is undefined for EMPLOYEE_ID = " + existingObject.EMPLOYEE_ID)

            if (employee.ONLINE_STATUS === C_.eoOffline && subproject.INTERMEDIATE_LANGUAGE_ID === 0) {
                const subject = `You have been accepted to ${value === C_.tsTranslating ? "translate" : "proofread"} project ${project.PROJECT_NUMBER} - ${languageWithID(
                    subproject.LANGUAGE_ID
                )}`
                sendEmail(
                    settings("RECRUITMENT_EMAIL"),
                    employee.EMAIL,
                    subject,
                    `Dear translator,\n\n${subject}. Please login to Tranwise and confirm the assignment by clicking on the "confirm" button on the projects details page.\n\nBest regards,\nUniversal Translation Services`
                )
            }
        }

        if (field === "STATUS" && value === C_.tsTranslating) {
            // This function sends the editor link only if needed (for projects with TEMPLATE_EDITOR_LINK set)
            sendTemplateEditorLinkToTranslator(existingObject)
        }
    }

    if (table === "PROJECTS_MESSAGES") {
        // If the message from the client has been approved for the translator, send the message object to the transaltor
        if (field === "SENDER" && value === "CL" && existingObject) {
            // First wait a little to make sure the message content is updated in the database,
            // because the project manager might have edited the message before approving it
            await utils.delay(5000)

            // Get the message from the database
            const existingMessage = await getObjectDetails(pk, table)

            // Create a new message with some of the details and forward it to the translator
            const messageForTranslator = { table: "PROJECTS_MESSAGES", SENDER: "CL", clientToTranslator: true }
            const fieldsToCopy = ["PK", "PROJECT_ID", "SUBPROJECT_ID", "TRANSLATION_ID", "RECIPIENT", "MESSAGE", "MESSAGE_TIME", "IS_READ", "PREVIEW"]
            fieldsToCopy.forEach(field => (messageForTranslator[field] = existingMessage[field]))
            messageForTranslator.RECIPIENT = parseInt(messageForTranslator.RECIPIENT, 10)
            forwardMessage("INSERT_OBJECT", messageForTranslator)

            const projectInfo = await getProjectInformation(existingMessage.PROJECT_ID)
            const projectNumber = projectInfo && projectInfo.project ? ` about project ${projectInfo.project.PROJECT_NUMBER}` : ""

            // Check if the user is offline and send an email if needed
            const employee = await db.getFullObject(existingMessage.RECIPIENT, "EMPLOYEES")
            if (employee && employee.ONLINE_STATUS === C_.eoOffline && utils.isValidEmail(employee.EMAIL))
                sendEmail(settings("JOBS_EMAIL"), employee.EMAIL, "You have a new message in Tranwise" + projectNumber, existingMessage.MESSAGE)
        }

        if (field === "RECIPIENT" && value === "CL") {
            if (!existingObject || existingObject.RECIPIENT != "T2C") return

            // First wait a little to make sure the message content is updated in the database,
            // because the project manager might have edited the message before approving it
            await utils.delay(5000)

            const projectInfo = await getProjectInformation(existingObject.PROJECT_ID)
            if (!projectInfo) return

            const project = projectInfo.project
            sendTemplateEmail("PROJECT_MESSAGE", projectInfo.division, projectInfo.division.EMAIL.replace("info@", "do-not-reply@"), project.PROJECT_EMAIL, {
                client_order_number: project.CLIENT_ORDER_NUMBER,
                project_number: project.PROJECT_NUMBER,
                message: existingObject.MESSAGE,
                link_for_reply: linkForTranwiseWeb("replyToTranslator", project.CLIENT_ID, existingObject.PK)
            })
        }
    }

    if (table === "INVOICES") {
        if (field === "STATUS" && value === C_.isPaid) postAffiliateDataForInvoice(existingObject)
    }
}

async function performInsertActions(insertedObject) {
    if (!insertedObject) return

    const table = insertedObject.table

    if (table === "SUBPROJECTS" && insertedObject.PROJECT_ID) {
        // When a subproject is inserted, get the project (without any existing subprojects) and just add
        // the inserted subproject (a new object based on insertedObject), then push the message to the translators.
        const projectData = await getNewProjectDataForTranslators(insertedObject.PROJECT_ID, false)
        const statuses = [C_.psPending, C_.psTranslation, C_.psProofreading, C_.psCheckPhase, C_.psReopened]
        if (projectData && statuses.includes(projectData.STATUS)) {
            const insertedSubproject = { table: "SUBPROJECTS", PK: insertedObject.PK, PROJECT_ID: insertedObject.PROJECT_ID, LANGUAGE_ID: insertedObject.LANGUAGE_ID }
            projectData.subprojects = [insertedSubproject]
            forwardMessage("NEW_PROJECT", projectData)

            sendEmailsAboutSubproject(insertedObject)
            sendTelegramsAboutSubproject(insertedObject)
        }

        const project = await db.getFullObject(insertedObject.PROJECT_ID, "PROJECTS")
        if (project) updateProjectPrice(project)
    }

    if (table === "TRANSLATIONS") {
        if (insertedObject.STATUS === C_.tsTranslating) {
            // This function sends the editor link only if needed (for projects with TEMPLATE_EDITOR_LINK set)
            sendTemplateEditorLinkToTranslator(insertedObject)
        }
    }

    if (table === "PROJECTS") {
        const project = insertedObject
        sendOverdueInvoicesRemindersToClient(project.CLIENT_ID, project.PROJECT_EMAIL)

        if (project.TWILIO_STATUS > 0) updateObject(project.CLIENT_ID, "CLIENTS", "LAST_TWILIO_PROJECT_ID", project.PK)

        if (project.HAS_PDF_FILES)
            sendEmail(
                settings("SYSTEM_EMAIL"),
                settings("SUPPORT_EMAIL"),
                "Tranwise: Project " + project.PROJECT_NUMBER + " has PDF files to be converted",
                "Tranwise: Project " + project.PROJECT_NUMBER + " has PDF files to be converted"
            )

        if (project.USES_GLOSSARIES)
            sendEmail(
                settings("SYSTEM_EMAIL"),
                settings("SUPPORT_EMAIL"),
                "Tranwise: Project " + project.PROJECT_NUMBER + " uses glossaries",
                "Tranwise: Project " + project.PROJECT_NUMBER + " uses glossaries"
            )
    }

    if (table === "CLIENTS") {
        const client = insertedObject
        const division = divisions[client.DIVISION_ID]
        if (!division) return log("ERROR", `performUpdateActions: CLIENTS : division is undefined for DIVISION_ID = ${client.DIVISION_ID}, client.PK = ${client.PK}`)

        let emails = []
        client.EMAILS.replace(/\r\n/g, "\n")
            .split("\n")
            .forEach(emailRaw => {
                const email = utils.getEmailAddress(emailRaw)
                if (email && utils.isValidEmail(email) && !emails.includes(email)) emails.push(email)
            })
        if (utils.isValidEmail(emails[0])) subscribeToMailChimp(emails[0], client.CLIENT_NAME, division.MAILCHIMP_API_KEY, division.MAILCHIMP_LIST_ID)

        sendEmail(
            settings("SYSTEM_EMAIL"),
            settings("GENERAL_MANAGER_EMAIL"),
            "Tranwise: New client for " + division.DIVISION + ": " + client.CLIENT_NAME,
            "Tranwise: New client for " + division.DIVISION + ": " + client.CLIENT_NAME
        )
    }

    if (table === "PREQUOTES") {
        const prequote = insertedObject

        const client = await db.getFullObject(prequote.CLIENT_ID, "CLIENTS")
        if (!client) return log("ERROR", `performUpdateActions: PREQUOTES : client is undefined for CLIENT_ID = ${prequote.CLIENT_ID}`)

        const division = divisions[client.DIVISION_ID]
        if (!division) return log("ERROR", `performUpdateActions: PREQUOTES : division is undefined for DIVISION_ID = ${client.DIVISION_ID}, client.PK = ${client.PK}`)

        sendEmail(
            settings("SYSTEM_EMAIL"),
            division.EMAIL,
            "Tranwise: New prequote available from " + client.CLIENT_NAME,
            `There is a new prequote available in Tranwise from client ${client.CLIENT_NAME}. ` +
                `In order to convert it into a quote, please use the following ID: ${prequote.PK * 678 + 12345}`
        )
    }

    if (table === "EMPLOYEES_MESSAGES") {
        const message = insertedObject

        const employee = await db.getFullObject(message.TO_ID, "EMPLOYEES")
        if (!employee) return log("ERROR", `performInsertActions: Missing recipient for PK = ${message.TO_ID}`)

        if (employee.ONLINE_STATUS != C_.eoOffline) return

        let senderName = ""

        if (message.FROM_ID > 0) {
            const sender = await db.getFullObject(message.FROM_ID, "EMPLOYEES")
            if (!sender) return log("ERROR", `performInsertActions: EMPLOYEES_MESSAGES: Missing sender for PK = ${message.FROM_ID}`)
            senderName = sender.FIRST_NAME + " " + sender.LAST_NAME
        } else if (message.FROM_CLIENT_ID > 0) {
            senderName = "the client"
        }

        if (senderName)
            sendTemplateEmail("TRANSLATOR_NEW_MESSAGE", null, settings("JOBS_EMAIL"), employee.EMAIL, {
                sender: senderName,
                message: message.MESSAGE
            })
    }

    if (table === "EMPLOYEES_FILES") {
        const file = insertedObject

        const employee = await db.getFullObject(file.TO_ID, "EMPLOYEES")
        if (!employee) return log("ERROR", `performInsertActions: EMPLOYEES_FILES: Missing recipient for PK = ${file.TO_ID}`)

        if (employee.ONLINE_STATUS != C_.eoOffline) return

        if (file.FROM_ID > 0) {
            const sender = await db.getFullObject(file.FROM_ID, "EMPLOYEES")
            if (!sender) return log("ERROR", `performInsertActions: EMPLOYEES_FILES: Missing sender for PK = ${file.FROM_ID}`)

            sendTemplateEmail("TRANSLATOR_NEW_FILE", null, settings("JOBS_EMAIL"), employee.EMAIL, {
                sender: sender.FIRST_NAME + " " + sender.LAST_NAME,
                file_name: file.FILE_NAME
            })
        }
    }

    if (table === "PROJECTS_FILES") {
        const file = insertedObject
        // !file.PREFIX is added to not the "for checking" file uploaded directly by tranwise when a translated file is uploaded.
        if (file.FILE_TYPE === C_.pfFinal && file.CONTENTS === "NOT_NC" && file.CONTENTS_OTHER != "TEMPLATE_FILE" && !file.PREFIX) sendTranslatedFileForCheck(file.PK, false, false, true) // The function checks if the project is notarized or certified and skips it otherwise

        if (file.FILE_TYPE === C_.pfDigitalCertification) sendDigitalCertification(file)

        if (file.FILE_TYPE === C_.pfDigitalNotarization) sendDigitalNotarization(file)

        if (file.FILE_TYPE === C_.pfTranslated) {
            const project = await db.getFullObject(file.PROJECT_ID, "PROJECTS")
            // if project is notarized or is ceritifed
            if (project.IS_NOTARIZED || project.IS_CERTIFIED) {
                const employee = await db.getFullObject(file.EMPLOYEE_ID, "EMPLOYEES")
                // if uploaded by translator, has to be added as pre checking
                if (employee.EMPLOYEE_TYPE === C_.etTranslator) {
                    if (project.PROJECT_TYPE === 2) {
                        insertLocalObject({
                            table: "PROJECTS_FILES",
                            PROJECT_ID: file.PROJECT_ID,
                            FILE_TYPE: C_.pfFinal,
                            FILE_NAME: file.FILE_NAME,
                            SIZE: file.SIZE,
                            PREFIX: file.PK,
                            CONTENTS: "NOT_NC",
                            CONTENTS_OTHER: "PRE_CHECKING"
                        })
                    }
                } else {
                    // if added by manager file added as for checking
                    insertLocalObject({
                        table: "PROJECTS_FILES",
                        PROJECT_ID: file.PROJECT_ID,
                        FILE_TYPE: C_.pfFinal,
                        FILE_NAME: file.FILE_NAME,
                        SIZE: file.SIZE,
                        PREFIX: file.PK,
                        CONTENTS: "NOT_NC",
                        // EMPLOYEE_ID: file.EMPLOYEE_ID  // If required to show file uploaded by the manager instead of Transwise add employee id.
                    })
                }
            }
        }

        sendProjectMessageForUploadedFile(file)

        if (file.isForPrequote) {
            const finalLocation = projectFilePath(file)
            utils.moveFile(config.storeFolder + "Files/TEMP/" + file.fileID, finalLocation)
        }
    }

    if (table === "PROJECTS_MESSAGES") {
        const message = insertedObject

        if (message.RECIPIENT === "CL") {
            const project = await db.getFullObject(message.PROJECT_ID, "PROJECTS")
            if (!project) return log("ERROR", `performInsertActions: PROJECTS_MESSAGES: project is undefined for PK = ${message.PROJECT_ID}`)

            const client = await db.getFullObject(project.CLIENT_ID, "CLIENTS")
            if (!client) return log("ERROR", `performUpdateActions: PROJECTS_MESSAGES : client is undefined for CLIENT_ID = ${project.CLIENT_ID}`)

            const division = divisions[client.DIVISION_ID]
            if (!division) return log("ERROR", `performUpdateActions: PROJECTS_MESSAGES : division is undefined for DIVISION_ID = ${client.DIVISION_ID}, client.PK = ${client.PK}`)

            if (project.TWILIO_STATUS > 0 && project.PROJECT_EMAIL === settings("EMAIL_FOR_TWILIO_PROJECTS")) {
                let phoneNumber = (client.PHONE_NUMBERS || "").split("\r\n")[0]
                insertLocalObject({
                    table: "TWILIO_MESSAGES",
                    PHONE_NUMBER: phoneNumber,
                    MESSAGE: message.MESSAGE.slice(0, 1600),
                    SENDER_ID: 1000000, // Sent by the server
                    IS_ANSWERED: true,
                    IS_WHATSAPP: project.TWILIO_STATUS === 2 ? 1 : 0
                })
            } else {
                sendEmail(
                    division.EMAIL,
                    project.PROJECT_EMAIL,
                    `Regarding project "${project.CLIENT_ORDER_NUMBER}" (${project.PROJECT_NUMBER})`,
                    message.MESSAGE + "\n\n" + division.EMAIL_SIGNATURE
                )
            }
        }

        if (["CL", "MT"].includes(message.SENDER) || parseInt(message.SENDER, 10) > 0) {
            const recipientID = parseInt(message.RECIPIENT, 10)
            if (!recipientID) return

            const employee = await db.getFullObject(recipientID, "EMPLOYEES")
            if (!employee) return log("ERROR", `performInsertActions: PROJECTS_MESSAGES: Missing recipient for PK = ${message.RECIPIENT}`)

            if (employee.ONLINE_STATUS != C_.eoOffline) return

            const projectInfo = await getProjectInformation(message.PROJECT_ID)
            const projectNumber = projectInfo && projectInfo.project ? ` about project ${projectInfo.project.PROJECT_NUMBER}` : ""

            sendEmail(settings("JOBS_EMAIL"), employee.EMAIL, "You have a new message in Tranwise" + projectNumber, message.MESSAGE)
        }
    }

    if (table === "TWILIO_MESSAGES") {
        if (insertedObject.SENDER_ID) {
            let divisionId = insertedObject.DIVISION_ID || 7;
            if (insertedObject.IS_WHATSAPP) {
                sendTwilioWhatsapp(insertedObject.PHONE_NUMBER, insertedObject.MESSAGE, divisionId)
            }
            else {
                sendTwilioSMS(insertedObject.PHONE_NUMBER, insertedObject.MESSAGE, divisionId)
            }
        }
    }
}

async function performDeleteActions(existingObject, pk, table) {
    if (table === "SUBPROJECTS") {
        if (!existingObject) return

        const project = await db.getObjectWithQuery(`SELECT * FROM PROJECTS WHERE PK = ${existingObject.PROJECT_ID}`)
        if (project) updateProjectPrice(project, pk)
    }
}

async function getNewProjectDataForTranslators(projectID, includeSubprojects) {
    if (!projectID) return log("ERROR", `getNewProjectDataForTranslators: wrong projectID: ${projectID}`)

    const projectsQuery = `SELECT PK,PROJECT_NUMBER,STATUS,SOURCE_LANGUAGE_ID FROM PROJECTS WHERE PK = ${projectID}`
    const projects = await db.getObjectsWithQuery(projectsQuery)
    const project = projects[0]

    if (!project) return log("ERROR", `getNewProjectDataForTranslators: missing project for id = ${projectID}`)

    project.t = utils.getDetailsToken("PROJECTS", project.PK)

    if (includeSubprojects) {
        const subprojectsQuery = `SELECT PK,PROJECT_ID,LANGUAGE_ID,INTERMEDIATE_LANGUAGE_ID,ALLOW_PROOFREADERS_SPECIAL FROM SUBPROJECTS WHERE PROJECT_ID = ${projectID}`
        project.subprojects = await db.getObjectsWithQuery(subprojectsQuery)
    }

    return project
}

// Sends an email to all the translators that are not online to inform them that there is a new job available
async function sendEmailsAboutSubproject(subproject, isResending) {
    if (!subproject) return
    if (subproject.INTERMEDIATE_LANGUAGE_ID > 0) return

    const project = await db.getObjectWithQuery(`SELECT * FROM PROJECTS WHERE PK = ${subproject.PROJECT_ID}`)
    if (!project) return log("ERROR", `sendEmailsAboutSubproject: Missing project with PK = ${subproject.PROJECT_ID} for subproject with PK = #{subproject.PK}`)

    let catTools = ""
    let i = 1
    while (i <= project.CAT_TOOLS.length && i <= 14) {
        if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 14].includes(i) && project.CAT_TOOLS[i - 1] === "1") catTools += C_.catToolsNames[i - 1] + ", "
        i++
    }
    catTools += project.CAT_TOOLS_OTHER.trim()
    if (catTools.endsWith(", ")) catTools = catTools.slice(0, -2)
    if (!catTools) catTools = "None"

    let query =
        "SELECT EMPLOYEES.PK, EMAIL, NATIVE_LANGUAGE_1_ID, NATIVE_LANGUAGE_2_ID, UTC_OFFSET FROM EMPLOYEES " +
        "INNER JOIN EMPLOYEES_LANGUAGES ON EMPLOYEE_ID = EMPLOYEES.PK " +
        `AND SOURCE_LANGUAGE_ID = ${project.SOURCE_LANGUAGE_ID} AND TARGET_LANGUAGE_ID = ${subproject.LANGUAGE_ID}` +
        " AND EMPLOYEE_TYPE = 1 AND ONLINE_STATUS = 0 AND IS_NOT_AVAILABLE = 0"

    if (isResending)
        query =
            "SELECT EMPLOYEES.PK, EMAIL, NATIVE_LANGUAGE_1_ID, NATIVE_LANGUAGE_2_ID, UTC_OFFSET FROM EMPLOYEES " +
            "INNER JOIN EMPLOYEES_LANGUAGES ON EMPLOYEE_ID = EMPLOYEES.PK " +
            `AND SOURCE_LANGUAGE_ID = ${project.SOURCE_LANGUAGE_ID} AND TARGET_LANGUAGE_ID = ${subproject.LANGUAGE_ID}` +
            ` AND EMPLOYEE_TYPE = 1 AND IS_NOT_AVAILABLE = 0 AND EMPLOYEES.PK NOT IN (SELECT EMPLOYEE_ID FROM TRANSLATIONS WHERE SUBPROJECT_ID = ${subproject.PK})`

    const employees = await db.getObjectsWithQuery(query)

    for (let emp of employees) {
        if (!utils.isValidEmail(emp.EMAIL)) continue
        const hasNativeLanguage = helper.employeeHasNativeLanguage(emp, subproject.LANGUAGE_ID)

        let projectType = ""
        if (project.PROJECT_TYPE === C_.ptTranslateProofread) projectType = hasNativeLanguage ? "Translation and Proofreading" : "Translation"
        if (project.PROJECT_TYPE === C_.ptTranslate) projectType = "Translation"
        if (project.PROJECT_TYPE === C_.ptProofread && hasNativeLanguage) projectType = "Proofreading"
        if (!projectType) continue

        const deadlineTranslation = projectType.includes("Translation")
            ? "Deadline for translation: " + utils.formatDate(helper.dateForEmployee(project.DEADLINE_TRANSLATOR, emp))
            : ""
        const deadlineProofreading = projectType.includes("Proofreading")
            ? "Deadline for proofreading: " + utils.formatDate(helper.dateForEmployee(project.DEADLINE_PROOFREADER, emp))
            : ""

        let emailType = "NEW_JOB_ALERT"
        if (project.VIDEO_INTERPRETING_STATUS > 0) emailType = "NEW_JOB_ALERT_VIDEO_INTERPRETING"

        const fields = {
            project_number: project.PROJECT_NUMBER,
            source_words: project.SOURCE_WORDS,
            project_type: projectType,
            language_combination: languageWithID(project.SOURCE_LANGUAGE_ID) + " to " + languageWithID(subproject.LANGUAGE_ID),
            deadline_translation: deadlineTranslation,
            deadline_proofreading: deadlineProofreading,
            meeting_time: utils.formatDate(helper.dateForEmployee(project.DEADLINE_TRANSLATOR, emp)),
            special_instructions: project.SPECIAL_INSTRUCTIONS,
            cat_tools: catTools
        }

        sendTemplateEmail(emailType, null, settings("JOBS_EMAIL"), emp.EMAIL, fields, null, { lowPriority: true })

        await utils.delay(100)
    }
}

// Sends a Telegram to all the translators that are not online to inform them that there is a new job available
async function sendTelegramsAboutSubproject(subproject) {
    if (!subproject) return
    if (subproject.INTERMEDIATE_LANGUAGE_ID > 0) return

    const project = await db.getObjectWithQuery(`SELECT * FROM PROJECTS WHERE PK = ${subproject.PROJECT_ID}`)
    if (!project) return log("ERROR", `sendEmailsAboutSubproject: Missing project with PK = ${subproject.PROJECT_ID} for subproject with PK = #{subproject.PK}`)

    let catTools = ""
    let i = 1
    while (i <= project.CAT_TOOLS.length && i <= 14) {
        if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 14].includes(i) && project.CAT_TOOLS[i - 1] === "1") catTools += C_.catToolsNames[i - 1] + ", "
        i++
    }
    catTools += project.CAT_TOOLS_OTHER.trim()
    if (catTools.endsWith(", ")) catTools = catTools.slice(0, -2)
    if (catTools) catTools = ", CAT: " + catTools.replace(/"/g, "")

    let query =
        "SELECT EMPLOYEES.PK, FIRST_NAME, LAST_NAME, NATIVE_LANGUAGE_1_ID, NATIVE_LANGUAGE_2_ID, UTC_OFFSET, TELEGRAM_ID FROM EMPLOYEES " +
        "INNER JOIN EMPLOYEES_LANGUAGES ON EMPLOYEE_ID = EMPLOYEES.PK " +
        `AND SOURCE_LANGUAGE_ID = ${project.SOURCE_LANGUAGE_ID} AND TARGET_LANGUAGE_ID = ${subproject.LANGUAGE_ID} ` +
        "AND EMPLOYEE_TYPE = 1 AND TELEGRAM_ID <> '' AND IS_NOT_AVAILABLE = 0 AND (ONLINE_STATUS = 0 OR TELEGRAM_WHEN_ONLINE = 1)"

    const employees = await db.getObjectsWithQuery(query)

    const telegrams = []
    for (let emp of employees) {
        if (!helper.isTelegramIDValid(emp.TELEGRAM_ID)) continue

        const hasNativeLanguage = helper.employeeHasNativeLanguage(emp, subproject.LANGUAGE_ID)

        let projectType = ""
        if (project.PROJECT_TYPE === C_.ptTranslateProofread) projectType = hasNativeLanguage ? "Translation and Proofreading" : "Translation"
        if (project.PROJECT_TYPE === C_.ptTranslate) projectType = "Translation"
        if (project.PROJECT_TYPE === C_.ptProofread && hasNativeLanguage) projectType = "Proofreading"
        if (!projectType) continue

        let projectTypeForTranslator = 0
        if (project.PROJECT_TYPE === C_.ptTranslateProofread) projectTypeForTranslator = hasNativeLanguage ? 1 : 2
        if (project.PROJECT_TYPE === C_.ptTranslate) projectTypeForTranslator = 2
        if (project.PROJECT_TYPE === C_.ptProofread && hasNativeLanguage) projectTypeForTranslator = 3

        const deadlineTranslation = projectType.includes("Translation")
            ? "Tr: " + utils.formatDate(helper.dateForEmployee(project.DEADLINE_TRANSLATOR, emp), "D MMM YYYY [at] HH:mm")
            : ""
        const deadlineProofreading = projectType.includes("Proofreading")
            ? " Pr: " + utils.formatDate(helper.dateForEmployee(project.DEADLINE_PROOFREADER, emp), "D MMM YYYY [at] HH:mm")
            : ""

        const projectNumber = `${project.PROJECT_NUMBER} ${languageWithID(project.SOURCE_LANGUAGE_ID).slice(0, 3)} -> ${languageWithID(subproject.LANGUAGE_ID).slice(0, 3)}`
        let message =
            projectNumber +
            ` (${C_.areasOfExpertiseValues[project.AREA_OF_EXPERTISE]}), ` +
            `${project.SOURCE_WORDS} words, ${projectType}, Deadline ${deadlineTranslation}${deadlineProofreading}${catTools}.`

        if (project.VIDEO_INTERPRETING_STATUS > 0)
            message = `Video interpreting job: ${projectNumber} -- Meeting time: ${utils.formatDate(
                helper.dateForEmployee(project.DEADLINE_TRANSLATOR, emp),
                "D MMM YYYY [at] HH:mm"
            )}.`

        telegrams.push(
            (
                "{" +
                `"name":"${emp.FIRST_NAME.replace(/"/g, "")}",` +
                `"surname":"${emp.LAST_NAME.replace(/"/g, "")}",` +
                `"phone":"${emp.TELEGRAM_ID.slice(2)}",` +
                `"project_id":"${subproject.PK}",` +
                `"user_id":"${emp.PK}",` +
                `"project_type":"${projectTypeForTranslator}",` +
                `"project_title":"${projectNumber}",` +
                `"message":"${message}"` +
                "}"
            ).replace(/[\\/]/g, "") // Removes any \ and /
        )
    }

    // Send a request for every 10 telegrams to avoid timeout on the telegram server
    let telegramsToSend = []
    for (let telegram of telegrams) {
        telegramsToSend.push(telegram)
        if (telegramsToSend.length === 10) {
            sendHTTPPostRequestWithFormData(settings("TELEGRAM_JOB_POST_URL"), { messagedata: "[" + telegramsToSend.join(",") + "]" }, true)
            log("TELEGRAM", "[" + telegramsToSend.join(",") + "]", true)
            telegramsToSend = []
            await utils.delay(1000)
        }
    }

    // Send the remaining items that didn't fit in the previous request with 10 telegrams
    if (telegramsToSend.length) {
        sendHTTPPostRequestWithFormData(settings("TELEGRAM_JOB_POST_URL"), { messagedata: "[" + telegramsToSend.join(",") + "]" }, true)
        log("TELEGRAM", "[" + telegramsToSend.join(",") + "]", true)
    }
}

async function resendSubprojectToTranslators(subprojectID) {
    if (!subprojectID || isNaN(subprojectID)) return
    const subproject = await db.getObjectWithQuery("SELECT * FROM SUBPROJECTS WHERE PK = " + db.escape(subprojectID))
    if (subproject) sendEmailsAboutSubproject(subproject, true)
}

// This array contains the list of managers that sent messages to translators.
// It is used in the function processChat below, to know whether a message from a translator
// to a project manager is a reply to the manager's message or a new conversation
const chatTimesFromManagersToTranslators = []

// If the message is to a project manager, add a record into PENDING_CHATS
async function processChat(data, senderName) {
    if (!data || !data.senderID || !data.recipientID) return

    // Check if the chat is to or from a project manager
    const employees = await db.getObjectsWithQuery(`SELECT PK FROM EMPLOYEES WHERE (PK = ${db.escape(data.senderID)} OR PK = ${db.escape(data.recipientID)}) AND EMPLOYEE_TYPE = 2`)
    // If we don't get exactly one record, it means that the chat is either between two translators or two managers
    if (employees.length != 1) return

    const manager = employees[0]
    if (!manager) return

    // If the chat is to a manager, check if there is any recent message from the manager to this employee.
    // If found, it means that the translator's message is a reply to the manager, so return
    if (manager.PK === data.recipientID)
        for (let chat of chatTimesFromManagersToTranslators) if (chat.senderID === data.recipientID && chat.recipientID === data.senderID && utils.now() - chat.time < 14400) return

    // Get all the pendingChats between these two users
    const pendingChats = await db.getObjectsWithQuery(
        `SELECT * FROM PENDING_CHATS WHERE (FROM_ID = ${db.escape(data.senderID)} AND TO_ID = ${db.escape(data.recipientID)}) ` +
            `OR (FROM_ID = ${db.escape(data.recipientID)} AND TO_ID = ${db.escape(data.senderID)})`
    )

    // If the chat is to a manager
    if (manager.PK === data.recipientID) {
        // Check if there are any pending chats from this translator to this manager in the past 4 hours
        // If found, add the existing message to that chat and return
        for (let chat of pendingChats)
            if (data.recipientID === manager.PK && utils.now() - chat.TIME < 14400) {
                updateObject(chat.PK, "PENDING_CHATS", "TEXT", chat.TEXT + "\n" + data.text)
                return
            }

        // Otherwise insert a pending chat
        insertLocalObject({
            table: "PENDING_CHATS",
            FROM_ID: data.senderID,
            TO_ID: data.recipientID,
            TIME: utils.now(),
            TEXT: data.text,
            metadata: { SENDER_NAME: senderName }
        })
    }

    // If the chat is from a manager
    if (manager.PK === data.senderID) {
        // Find any unanswered pending chats from this user and mark them as answered
        for (let chat of pendingChats) if (!chat.ANSWERED_TIME) updateObject(chat.PK, "PENDING_CHATS", "ANSWERED_TIME", utils.now())

        // Check if we have another recent message from the manager to this translator
        // and add a record if we don't, so we know that this manager has sent a message
        // to this translator recently
        let found = false
        for (let chat of chatTimesFromManagersToTranslators) {
            if (chat.senderID === data.senderID && chat.recipientID === data.recipientID && utils.now() - chat.time < 14400) {
                found = true
                break
            }
        }

        if (!found)
            chatTimesFromManagersToTranslators.push({
                senderID: data.senderID,
                recipientID: data.recipientID,
                time: utils.now()
            })
    }
}

async function getObjectDetails(pk, table) {
    if (!pk) return
    const query = `SELECT * FROM ${table} WHERE PK = ${pk} LIMIT 1`
    const result = await db.getObjectsWithQuery(query)
    return result[0]
}

async function getProjectForTranslationID(pk) {
    if (!pk) return
    const query = `SELECT PROJECTS.* FROM PROJECTS JOIN SUBPROJECTS ON PROJECT_ID = PROJECTS.PK JOIN TRANSLATIONS ON SUBPROJECT_ID = SUBPROJECTS.PK AND TRANSLATIONS.PK = ${pk}`
    return await db.getObjectWithQuery(query)
}

async function sendTemplateEditorLinkToTranslator(translation) {
    const project = await getProjectForTranslationID(translation.PK)

    if (!project) return log("ERROR", "sendTemplateEditorLinkToTranslator - Undefined project for translation with pk " + translation.PK)
    if (!project.TEMPLATE_EDITOR_LINK) return

    const message =
        "Dear translator,\n\nNOTIFICATION: This translation is DIFFERENT and is a Template Translation. A Template Translation is a translation where the source file is already translated. Below you will find the link to the online template editor. In this editor you have to fill in the personal details of client from the source file that is uploaded in Tranwise.\n\n" +
        `This is the link to the template file where you have to match your source file with this template:\n\n${project.TEMPLATE_EDITOR_LINK}\n\n` +
        "The source file is uploaded in tranwise under MAIN file.\n\n" +
        "When you are ready with the editing, please make sure to click the checkmark button at the bottom, so the project managers are informed about it.\n\nThank you!"

    const projectMessage = {
        table: "PROJECTS_MESSAGES",
        PROJECT_ID: project.PK,
        SUBPROJECT_ID: translation.SUBPROJECT_ID,
        TRANSLATION_ID: translation.PK,
        SENDER: "MT",
        RECIPIENT: translation.EMPLOYEE_ID,
        MESSAGE: message,
        IS_PROBLEM: false,
        metadata: {
            PROJECT_NUMBER: project.PROJECT_NUMBER
        }
    }

    insertLocalObject(projectMessage)
}

function processTranslatorRegistration(employee) {
    const username = employee.USERNAME
    employee.chatToken = utils.getChatToken(employee.PK)
    employee.ONLINE_STATUS = 0
    delete employee.USERNAME
    delete employee.PASSWORD_HASH

    forwardMessage("INSERT_OBJECT", employee)

    log("GLOBAL", `Translator registered: ${employee.FIRST_NAME} ${employee.LAST_NAME} (username: ${username} - pk: ${employee.PK})`, true)
    const emailText = `${employee.FIRST_NAME} ${employee.LAST_NAME} (username: ${username}) registered as a translator`
    mailer.sendEmail(settings("SYSTEM_EMAIL"), settings("RECRUITMENT_EMAIL"), emailText, emailText)
}

function sendFileToOCR(fileID, projectID, employeeID, fileName) {
    sendHTTPPostRequestWithFormData(settings("OCR_POST_URL"), {
        FILE_NAME: fileName,
        FILE_PATH: projectFilePath(fileName, fileID),
        PROJECT_ID: projectID,
        EMPLOYEE_ID: employeeID
    })
}

async function createPDFInvoice(invoiceID, clientID, projectID, isProforma) {
    let invoice = { CLIENT_ID: clientID }

    if (!isProforma) {
        invoice = await db.getObjectWithQuery("SELECT * FROM INVOICES WHERE PK = " + db.escape(invoiceID))
        if (!invoice) return log("ERROR", `Error in createPDFInvoice: Invoice not found for id = ${invoiceID}`)
    }

    const client = await db.getObjectWithQuery("SELECT * FROM CLIENTS WHERE PK = " + db.escape(invoice.CLIENT_ID))
    if (!client) return log("ERROR", `Error in createPDFInvoice: Client not found for id = ${invoice.CLIENT_ID}, invoiceID = ${invoiceID}`)

    const division = divisions[client.DIVISION_ID]
    if (!division) return log("ERROR", `Error in createPDFInvoice: Division not found for id = ${client.DIVISION_ID}, invoiceID = ${invoiceID}`)

    if (!projectID && isProforma) return log("ERROR", "Error in createPDFInvoice: No projectID specified for proforma invoice")

    const invoiceDate = isProforma ? utils.now() : invoice.INVOICE_DATE
    const invoiceNumber = isProforma ? "PF-" + projectID : helper.invoiceNumber(invoice)

    let email = utils.isValidEmail(client.EMAIL_FOR_INVOICES) ? client.EMAIL_FOR_INVOICES : ""

    const projects = projectID
        ? await db.getObjectsWithQuery("SELECT * FROM PROJECTS WHERE PK = " + db.escape(projectID))
        : await db.getObjectsWithQuery("SELECT * FROM PROJECTS WHERE INVOICE_ID = " + db.escape(invoiceID))

    const projectsPKs = projects.map(p => p.PK)
    const subprojects = await db.getObjectsWithQuery(`SELECT * FROM SUBPROJECTS WHERE PROJECT_ID IN (${projectsPKs.join(",")})`)

    let totalPriceWithVAT = 0
    let totalPriceWithoutVAT = 0
    let prepaymentAmount = 0
    let wasFullyPrepaid = false
    let currency
    let requiredPrepaymentPercent
    let prepaidInvoiceNumber
    let paymentDetails

    for (let project of projects) {
        totalPriceWithVAT += utils.roundPrice(project.CALCULATED_PRICE * (1 + project.VAT_RATE / 100))
        totalPriceWithoutVAT += project.CALCULATED_PRICE
        if (!email) email = project.PROJECT_EMAIL
        if (!currency) currency = project.CURRENCY
        requiredPrepaymentPercent = project.REQUIRED_PREPAYMENT_PERCENT
        prepaidInvoiceNumber = project.PREPAID_INVOICE_NUMBER
        if (project.REQUIRED_PREPAYMENT_PERCENT === 100) {
            wasFullyPrepaid = true
            paymentDetails = project.PAYMENT_DETAILS
        }
        if (project.REQUIRED_PREPAYMENT_PERCENT > 0) prepaymentAmount += (project.CALCULATED_PRICE * project.REQUIRED_PREPAYMENT_PERCENT) / 100
    }

    const amountToPay = isProforma ? prepaymentAmount : totalPriceWithVAT - prepaymentAmount
    const links = (division.INVOICE_LINKS || "").replace(/<\$PAYMENT_LINK\$>/g, `?invoice=${invoiceNumber}&amount=${utils.roundPrice(amountToPay * 100, 0)}&currency=${currency}`)

    let footerImageName = "Footer"
    if (invoiceDate < utils.getTimestamp(2010, 7, 1)) footerImageName = "FooterBeforeJuly2010"
    else if (invoiceDate < utils.getTimestamp(2011, 4, 1)) footerImageName = "FooterBeforeApril2011"
    else if (invoiceDate < utils.getTimestamp(2013, 11, 10)) footerImageName = "FooterBefore19November2013"

    const currencySymbol = C_.currencySymbols[currency]

    const documentPath = config.storeFolder + "Invoices/Invoice-" + invoiceNumber + ".pdf"
    const doc = pdf.createDocument(documentPath)

    function addHeaderAndFooter() {
        doc.addImage(config.invoiceResourcesPath + division.DIVISION + "Header.jpg", 16, 2, { width: 174, height: 56 })
        doc.addImage(config.invoiceResourcesPath + division.DIVISION + footerImageName + ".jpg", 2, 230, { width: 197, height: 62 })
    }

    addHeaderAndFooter()

    const clientCountry = (countries[client.COUNTRY_ID] || { COUNTRY: "" }).COUNTRY
    const clientAddress = `${client.ADDRESS}\n${clientCountry}\n${client.VAT_NUMBER ? "VAT #: " + client.VAT_NUMBER : ""}`

    doc.textBold("CLIENT", 19, 60)
    doc.text(client.CLIENT_NAME, 19, 65, { width: 75 })
    doc.textBold("CLIENT'S ADDRESS", 19, 75)
    doc.text(utils.removeMultipleReturns(clientAddress), 19, 80, { width: 75 })
    doc.textBold("CLIENT'S EMAIL", 19, 120)
    doc.text(email, 19, 125)

    if (!isProforma) {
        if (wasFullyPrepaid) {
            doc.textBold("INVOICE STATUS", 102, 105)
            doc.text("PREPAID", 102, 110)
            if (paymentDetails) doc.text("Payment information:\n" + paymentDetails, 19, 182, { width: 120 })
        } else {
            doc.textBold("PAYMENT TERMS", 102, 105)
            doc.text(`NET ${client.PAYMENT_TERMS || 30} DAYS`, 102, 110)
        }
    }

    let invoiceNumberTitle = isProforma ? "PROFORMA INVOICE" : "INVOICE AND REFERENCE NUMBER FOR PAYMENT"
    if (prepaidInvoiceNumber) invoiceNumberTitle = "INVOICE NUMBER / YOUR PAYMENT NUMBER"

    doc.textBold(invoiceNumberTitle, 102, 60)
    doc.text(invoiceNumber + (prepaidInvoiceNumber ? " / " + prepaidInvoiceNumber : ""), 102, 65)

    doc.textBold("INVOICE DATE", 102, 75)
    doc.text(utils.formatDate(invoiceDate, "D MMM YYYY"), 102, 80)

    if (totalPriceWithVAT - totalPriceWithoutVAT > 0.1) {
        doc.textBold("TOTAL EXCL. VAT", 102, 90)
        doc.text(currencySymbol + " " + utils.roundPrice(totalPriceWithoutVAT).toFixed(2), 102, 95)
        doc.textBold("VAT AMOUNT", 150, 90)
        doc.text(currencySymbol + " " + utils.roundPrice(totalPriceWithVAT - totalPriceWithoutVAT).toFixed(2), 150, 95)
    }

    doc.textBold("TOTAL INVOICED AMOUNT", 102, 120)
    doc.text(currencySymbol + " " + utils.roundPrice(isProforma ? prepaymentAmount : totalPriceWithVAT).toFixed(2), 102, 125)

    function addProjectsHeader(y) {
        doc.text("PROJECT\nNUMBER", 19, y)
        doc.text("DATE\nRECEIVED", 107, y)
        doc.text("SOURCE\nWORDS", 131, y)
        doc.text("TARGET\nWORDS", 153, y)
        doc.text("PROJECT\nTOTAL", 177, y)
        doc.addLine(18, y + 10, 192, y + 10, "grey")
    }
    addProjectsHeader(143)

    function addLinks() {
        // eslint-disable-next-line quotes
        const linksArray = (links || "").split('","')
        for (let i = 0; i < linksArray.length - 1; i += 2) {
            const link = linksArray[i].replace(/"/g, "")
            const area = linksArray[i + 1].replace(/"/g, "").split(",")
            doc.addLink(+area[0], +area[1], +area[2], +area[3], link)
        }
    }

    addLinks()

    let projectCount = 0
    let projectYCount = 7
    let clientOrderNumber = ""
    let projectNumber = ""
    for (let project of projects) {
        projectCount++
        projectYCount++

        if (projectCount === 1) {
            clientOrderNumber = project.CLIENT_ORDER_NUMBER
            projectNumber = project.PROJECT_NUMBER
        }

        if (projectYCount > 11) {
            doc.addPage().lineWidth(0.2)
            addHeaderAndFooter()
            addProjectsHeader(63)
            addLinks()
            projectYCount = 4
        }

        let languagesString = "Language: " + languageWithID(project.SOURCE_LANGUAGE_ID) + " into "
        for (let subproject of subprojects) if (subproject.PROJECT_ID === project.PK) languagesString += languageWithID(subproject.LANGUAGE_ID) + ", "
        languagesString = languagesString.slice(0, -2)
        if (languagesString.includes(",")) languagesString = languagesString.replace("Language: ", "Languages: ")

        let wordsString = ""
        if (project.PAYMENT_CLIENT === C_.ptBySourceWords) wordsString = "Word rate: " + currencySymbol + " " + utils.roundPrice(project.PRICE) + " / source word"
        if (project.PAYMENT_CLIENT === C_.ptByTargetWords) wordsString = "Word rate: " + currencySymbol + " " + utils.roundPrice(project.PRICE) + " / target word"
        if (project.PAYMENT_CLIENT === C_.ptByCatAnalysis) {
            const curr = currencySymbol
            wordsString =
                "Trados matches:   " +
                `100% & reps: ${project.WORDS_REPS} ( ${curr}${project.RATE_REPS} / wd )       ` +
                `Fuzzy: ${project.WORDS_FUZZY_MATCH} ( ${curr}${project.RATE_FUZZY_MATCH} / wd )       ` +
                `No matches: ${project.WORDS_NO_MATCH} ( ${curr}${project.RATE_NO_MATCH} / wd )       `
        }

        const y = projectYCount * 20 - 3
        doc.text(projectCount + ".", 11, y)
        doc.text(project.PROJECT_NUMBER, 19, y)
        doc.text(utils.formatDate(project.DATE_RECEIVED, "D MMM YYYY"), 107, y)
        doc.text(project.SOURCE_WORDS, 131, y)
        doc.text(project.TARGET_WORDS, 153, y)
        doc.text(currencySymbol + " " + utils.roundPrice(isProforma ? prepaymentAmount : project.CALCULATED_PRICE * (1 + project.VAT_RATE / 100)).toFixed(2), 177, y)
        doc.text("Client ref: " + project.CLIENT_ORDER_NUMBER, 25, y + 4, { width: 160 })
        doc.text(languagesString, 25, y + 8, { width: 160 })
        doc.text(wordsString, 25, y + 12)
    }

    projectYCount += 2
    if (prepaymentAmount > 0.01 && requiredPrepaymentPercent < 100 && !isProforma) {
        doc.fillColor("red").text(
            `IMPORTANT! PLEASE NOTE THAT A PROFORMA INVOICE OF ${currencySymbol} ${utils
                .roundPrice(prepaymentAmount)
                .toFixed(2)} ( ${requiredPrepaymentPercent} % ) HAS ALREADY BEEN PAID FOR THIS PROJECT.\nTHE REMAINING AMOUNT TO BE PAID IS ${currencySymbol} ${utils
                .roundPrice(amountToPay)
                .toFixed(2)}`,
            19,
            projectYCount * 20 - 3
        )
        doc.fillColor("red").text(`REMAINING AMOUNT TO BE PAID: ${currencySymbol} ${utils.roundPrice(amountToPay).toFixed(2)}`, 120, projectYCount * 20 - 20)
    }

    const paymentLink = division.INVOICE_LINKS.substr(1, division.INVOICE_LINKS.indexOf("<$PAYMENT_LINK$>") - 1)

    if (requiredPrepaymentPercent === 50 && isProforma)
        doc.fillColor(
            "red"
        ).text(
            "IMPORTANT! PLEASE USE THE LINK BELOW TO PAY THE INVOICE. THIS WILL SPEED UP THE TRANSLATION PROCESS AS THE PAYMENT WILL BE DIRECTLY VISIBLE IN OUR SYSTEM. YOU CAN USE DIRECT BANK TRANSFERS IN ALL COUNTRIES BY USING THIS LINK:\n\n" +
                paymentLink +
                "\n\nIf you make a payment outside this link by regular bank transfer it will delay the delivery of your translation project.",
            19,
            190,
            { width: 160 }
        )

    if (!isProforma && invoice && !invoice.IS_MONTHLY && !wasFullyPrepaid && !requiredPrepaymentPercent) {
        doc.fillColor(
            "red"
        ).text(
            "IMPORTANT! PLEASE USE THE LINK BELOW TO PAY THE INVOICE. THIS NEW SYSTEM WILL SOLVE PRIOR PROBLEMS REGARDING PAYMENT INFORMATION. USE THE LINK BELOW TO PAY YOUR INVOICES:\n\n" +
                paymentLink +
                "\n\nYou can use a variety of payment methods through this link including direct bank transfers of all countries.",
            19,
            200,
            { width: 180 }
        )
    }

    await doc.close()

    return { documentPath, division, email, invoice, invoiceNumber, clientOrderNumber, projectNumber }
}

async function generateCertificateForNotarizedProject(project, pdfFolder) {
    if (!project) return

    const client = await db.getObjectWithQuery(`SELECT * FROM CLIENTS WHERE PK = ${project.CLIENT_ID}`)
    if (!client) return log("ERROR", `Error in generateCertificateForNotarizedProject: Client not found for id = ${project.CLIENT_ID}, projectID = ${project.PK}`)

    const division = divisions[client.DIVISION_ID]
    if (!division) return log("ERROR", `Error in generateCertificateForNotarizedProject: Division not found for id = ${client.DIVISION_ID}, projectID = ${project.PK}`)

    let divisionName = division.NAME

    // For Wapa, ISO, LDT, NBT divisions generate the certificate in the name of Universal Translation Services
    if ("WILB".includes(division.DIVISION_CODE)) divisionName = "Universal Translation Services"

    let translations = []
    const subprojects = await db.getObjectsWithQuery(`SELECT * FROM SUBPROJECTS WHERE PROJECT_ID = ${project.PK}`)
    if (subprojects.length) {
        const subprojectsPKs = subprojects.map(subproject => subproject.PK).join(",")
        translations = await db.getObjectsWithQuery(
            `SELECT SUBPROJECT_ID, FIRST_NAME, LAST_NAME FROM TRANSLATIONS JOIN EMPLOYEES ON EMPLOYEE_ID = EMPLOYEES.PK AND STATUS = ${C_.tsTranslating} AND SUBPROJECT_ID IN (${subprojectsPKs})`
        )
    }

    const documentPath = `${pdfFolder}Certificate-${project.PROJECT_NUMBER}.pdf`
    const doc = pdf.createDocument(documentPath)

    let count = 0
    for (let subproject of subprojects) {
        if (count++ > 0) doc.addPage().lineWidth(0.2)
        doc.addImage(config.resourcesPath + "CertificateHeader" + division.DIVISION + ".jpg", 0, 0, { width: 210, height: 53 })
        doc.addImage(config.resourcesPath + "CertificateFooter" + division.DIVISION + ".jpg", 2, 263, { width: 206, height: 27 })

        if (project.IS_CERTIFIED) {
            doc.fillColor("#444444").text("A.H.J Huisman, Managing Director", 20, 223, { oblique: true })
            doc.text("Universal Translation Services", 20, 228, { oblique: true })
            doc.addImage(config.resourcesPath + "CertificateSignatureSimple.jpg", 25, 190, { width: 52, height: 32 })
        }

        doc.addImage(config.resourcesPath + "CertificateStamp.jpg", 20, 235, { width: 50, height: 28 })
        doc.addImage(config.resourcesPath + "CertificateATALogo.jpg", 88, 240, { width: 36, height: 18 })

        doc.fillColor("#5daac9").fontSize(14).textBold("CERTIFICATION OF TRANSLATION", 62, 52)
        doc.fontSize(10)

        let translatorNames = ""
        for (let translation of translations) if (translation.SUBPROJECT_ID === subproject.PK) translatorNames += `${translation.FIRST_NAME} ${translation.LAST_NAME}, `

        const text =
            `Project number: ${project.PROJECT_NUMBER}\n` +
            `Name of files: ${project.CLIENT_ORDER_NUMBER} / ${client.CLIENT_NAME}\n` +
            `Job performed on: ${utils.formatNow("DD-MM-YYYY")}\n` +
            `Translation from language: ${languageWithID(project.SOURCE_LANGUAGE_ID)}\n` +
            `Translation into language: ${languageWithID(subproject.LANGUAGE_ID)}\n` +
            `Translation performed by: ${translatorNames.slice(0, -2)}\n` +
            `Date of certification: ${utils.formatNow("MMMM D, YYYY")}`

        doc.textBold(text, 19, 65, { lineGap: 9 })

        doc.addLine(19, 126, 191, 126, "#444444")

        const disclaimer =
            `${divisionName}, a professional translation company, declares that the attached document(s) are stamped and signed by us and translated by qualified and professional ` +
            "translators, fluent in the above mentioned languages. In our best judgement, the translated text truly reflects the content, meaning and translation of the attached documents and / or copies " +
            "that the client provide us with.\n\n" +
            "A validation procedure was performed by us, which confirms that the provided language translation is complete and accurate. The document hasn't been translated by a family member, friend or business associate.\n\n" +
            `By signing this Certification of Translation, ${divisionName} declares that the translation is a true reflection of the source file(s). We do not guarantee that the original ` +
            "document is a genuine document or that the statements contained in the original document are true.\n\n" +
            `${divisionName} assumes no liability for the way the translation is used by the customer or any third party.`

        doc.fillColor("#555555").fontSize(9.5).text(disclaimer, 19, 128, { width: 175 })
    }

    if (project.IS_NOTARIZED) {
        doc.addPageSizeLetter().lineWidth(0.2)
        addNotarizationToDocument(doc, project)
    }

    await doc.close()
}

function addNotarizationToDocument(doc, project) {
    doc.addImage(config.resourcesPath + "NotaryDocument.jpg", 0, 0, { width: 204, height: 264 })
    doc.addImage(config.resourcesPath + "NotarySignature.jpg", 66, 185, { width: 24, height: 28 })

    doc.fillColor("#333333").fontSize(40).font("Times-Bold")
    doc.text("ACKNOWLEDGEMENT", 20, 20)
    doc.text("CERTIFICATE", 50, 40)

    doc.font("Times-Roman")
    doc.fillColor("#222222").fontSize(18).text("This Certificate is attached to a certified translation with", 20, 68)
    doc.text(`project number ${project.PROJECT_NUMBER} dated ${utils.formatNow("MMM D, YYYY")}.`, 20, 78)

    doc.fontSize(16)
    doc.text("STATE OF FLORIDA", 20, 95)
    doc.text("COUNTY OF MIAMI DADE", 20, 105)
    doc.text("Before me: Antonius Hoffmann on this day personally appeared", 20, 120)
    doc.text("Adriana Huisman to be the person whose name is subscribed to the", 20, 130)
    doc.text("foregoing instrument and acknowledged to me that she is executed", 20, 140)
    doc.text("the same for the purposes and consideration therein expressed.", 20, 150)
    doc.text(`Give under my hand and seal of office this ${utils.formatNow("MMM D, YYYY")}.`, 20, 160)
}

// Not used anymore
/*
async function generateNotarizationDocument(project, pdfFolder) {
    const documentPath = `${pdfFolder}Notarization-${project.PROJECT_NUMBER}.pdf`
    const options = { size: [204, 264] }
    const doc = pdf.createDocument(documentPath, options)

    addNotarizationToDocument(doc, project)

    await doc.close()
}
*/

async function generateCertificateOfEvidence(projectFile, pdfFolder) {
    if (!projectFile) return

    const projectInfo = await getProjectInformation(projectFile.PROJECT_ID)
    if (!projectInfo) return

    const project = projectInfo.project

    const passcode = utils.md5(`${projectFile.PK}${project.PK}TranwiseDigitalCertificationsSalt!`).slice(0, 20)

    const documentPath = `${pdfFolder}CertificateOfEvidence-${project.PROJECT_NUMBER}-us${projectFile.PK}.pdf`
    const options = {}
    const doc = pdf.createDocument(documentPath, options)

    doc.addImage(config.resourcesPath + "CertificateOfEvidence.jpg", 0, 0, { width: 210, height: 297 })

    doc.fillColor("#787878").fontSize(12)

    doc.text(utils.formatNow("MMMM D, YYYY"), 33, 56)
    doc.text("A.H.J. Huisman", 107, 56)
    doc.text("Universal Translation Services", 33, 68)
    doc.text("anita@universal-translation-services.com", 107, 67)
    doc.text("us" + projectFile.PK, 71, 126)
    doc.text(passcode, 128, 126)
    doc.text(project.PROJECT_NUMBER, 26, 154)
    doc.text(languageWithID(project.SOURCE_LANGUAGE_ID), 26, 167)
    doc.text(projectInfo.targetLanguages.replace(/Target languages*: /g, ""), 116, 167)
    doc.text("260038", 26, 203)
    doc.text("07-999-7079", 117, 203)
    doc.text("0633-90406207", 26, 216)
    doc.text("U.S. FDA CFR 21 Part 11 provided by AATL", 26, 250)

    await doc.close()

    return documentPath
}

async function createFilesForNotarizedProject(projectID, callback) {
    const project = await db.getObjectWithQuery(`SELECT * FROM PROJECTS WHERE PK = ${db.escape(projectID)}`)
    if (!project) return log("ERROR", `Error in createFilesForNotarizedProject: Project not found for id = ${projectID}`)

    const projectsFiles = await db.getObjectsWithQuery(`SELECT * FROM PROJECTS_FILES WHERE PROJECT_ID = ${db.escape(projectID)}`)

    const parentFolderPath = config.storeFolder + "Files/TEMP/" + utils.getUniqueID()
    utils.makeFolder(parentFolderPath)

    const folderPath = parentFolderPath + "/Files for notarization - " + project.PROJECT_NUMBER
    utils.makeFolder(folderPath)

    const sourceFilesPath = folderPath + "/Source files"
    utils.makeFolder(sourceFilesPath)

    const finalFilesPath = folderPath + "/Final files"
    utils.makeFolder(finalFilesPath)

    for (let projectFile of projectsFiles) {
        if (![C_.pfMain, C_.pfFinal, C_.pfFinalSent, C_.pfReopenedFinal, C_.pfReopenedFinalSent].includes(projectFile.FILE_TYPE)) continue
        if (projectFile.CONTENTS_OTHER === "TEMPLATE_FILE") continue
        const filePath = projectFilePath(projectFile)
        const sourceFolder = projectFile.FILE_TYPE === C_.pfMain ? sourceFilesPath : finalFilesPath
        if (!(await utils.copyFileWithFallback(filePath, sourceFolder + "/" + projectFile.FILE_NAME)))
            log("ERROR", `createFilesForNotarizedProject: Couldn't copy file from "${filePath}" for PK = ${projectFile.PK}`)
    }

    if (project.IS_NOTARIZED && !project.NOTARY_NUMBER) updateObject(project.PK, "PROJECTS", "NOTARY_NUMBER", getNextNotarizationNumber())

    await generateCertificateForNotarizedProject(project, folderPath + "/")
    // Not used anymore
    // if (project.IS_NOTARIZED) await generateNotarizationDocument(project, folderPath + "/")

    // If the project is from the template shop, download the source and target files from the online editor
    if (project.WEBSITE_ORDER_ID) {
        let url = `http://translation-editor.tranwise.com/docs/cloned/${project.WEBSITE_ORDER_ID.replace("_", "/")}`
        const response = await sendHTTPGetRequest(url)
        if (response && !response.error && response.content) {
            try {
                if (response.content.sourceDocument) await downloadFileFromURL(response.content.sourceDocument, sourceFilesPath)
            } catch (error) {}
            try {
                if (response.content.targetDocument) await downloadFileFromURL(response.content.targetDocument, finalFilesPath)
            } catch (error) {}
        }
    }

    const zipFile = config.storeFolder + "Files/0B_REQUESTED_FILES/Files for notarization - " + project.PROJECT_NUMBER + ".zip"
    utils.zipFolder(parentFolderPath, zipFile).then(() => {
        if (typeof callback === "function") callback(zipFile)
    })
}

async function sendDigitalCertification(projectFile, emailAddress) {
    if (!projectFile) return

    const projectInfo = await getProjectInformation(projectFile.PROJECT_ID)
    if (!projectInfo) return log("ERROR", `sendDigitalCertification: Undefined projectInfo for pk = ${projectFile.PROJECT_ID}`, true)
    const project = projectInfo.project

    if (!utils.isValidEmail(emailAddress)) emailAddress = project.PROJECT_EMAIL

    // Add the digital certificate file
    const filePath = projectFilePath(projectFile)
    if (!(await utils.fileExists(filePath))) return log("ERROR", `sendDigitalCertification: File doesn't exist for PK = ${projectFile.PK}, path = ${filePath}`, true)

    const tempFolder = config.storeFolder + "Files/TEMP/" + utils.getUniqueID()
    utils.makeFolder(tempFolder)
    let attachmentPath = tempFolder + "/" + projectFile.FILE_NAME
    if (!(await utils.copyFile(filePath, attachmentPath)))
        return log("ERROR", `sendDigitalCertification: Couldn't copy file from "${filePath}" to "${attachmentPath}" for PK = ${projectFile.PK}`, true)

    // Add the certificate of evidence (generate it if it doesn't exist)
    let certificateFileName = config.storeFolder + `Files/0B_REQUESTED_FILES/CertificateOfEvidence-${project.PROJECT_NUMBER}-us${projectFile.PK}.pdf`
    const certificateOfEvidenceExists = await utils.fileExists(certificateFileName)
    if (!certificateOfEvidenceExists) certificateFileName = await generateCertificateOfEvidence(projectFile, config.storeFolder + "Files/0B_REQUESTED_FILES/")
    attachmentPath += "," + certificateFileName

    sendTemplateEmail(
        "DIGITAL_CERTIFICATION",
        projectInfo.division,
        projectInfo.division.EMAIL,
        emailAddress,
        {
            project_number: project.PROJECT_NUMBER
        },
        attachmentPath
    )
}

async function sendDigitalNotarization(projectFile, emailAddress) {
    if (!projectFile) return

    const projectInfo = await getProjectInformation(projectFile.PROJECT_ID)
    if (!projectInfo) return log("ERROR", `sendDigitalNotarization: Undefined projectInfo for pk = ${projectFile.PROJECT_ID}`, true)
    const project = projectInfo.project

    if (!utils.isValidEmail(emailAddress)) emailAddress = project.PROJECT_EMAIL

    // Add the digital certificate file
    const filePath = projectFilePath(projectFile)
    if (!(await utils.fileExists(filePath))) return log("ERROR", `sendDigitalNotarization: File doesn't exist for PK = ${projectFile.PK}, path = ${filePath}`, true)

    const tempFolder = config.storeFolder + "Files/TEMP/" + utils.getUniqueID()
    utils.makeFolder(tempFolder)
    let attachmentPath = tempFolder + "/" + projectFile.FILE_NAME
    if (!(await utils.copyFile(filePath, attachmentPath)))
        return log("ERROR", `sendDigitalNotarization: Couldn't copy file from "${filePath}" to "${attachmentPath}" for PK = ${projectFile.PK}`, true)

    sendTemplateEmail(
        "DIGITAL_NOTARIZATION",
        projectInfo.division,
        projectInfo.division.EMAIL,
        emailAddress,
        {
            project_number: project.PROJECT_NUMBER,
            source_language: languageWithID(project.SOURCE_LANGUAGE_ID),
            target_languages: projectInfo.targetLanguages.replace(/Target languages*: /g, "")
        },
        attachmentPath
    )
}

async function sendDigitalCertificationOrNotarization(projectFileID, emailAddress) {
    const projectFile = await db.getFullObject(projectFileID, "PROJECTS_FILES")
    if (!projectFile) return log("ERROR", `sendDigitalCertificationOrNotarization: undefined project file for PK = ${projectFileID}`)

    if (projectFile.FILE_TYPE === C_.pfDigitalCertification) sendDigitalCertification(projectFile, emailAddress)
    if (projectFile.FILE_TYPE === C_.pfDigitalNotarization) sendDigitalNotarization(projectFile, emailAddress)
}

async function sendProjectMessageForUploadedFile(projectFile) {
    if (!projectFile) return
    if (![C_.pfTranslated, C_.pfProofread].includes(projectFile.FILE_TYPE)) return

    const projectInfo = await getProjectInformation(projectFile.PROJECT_ID)
    if (!projectInfo) return log("ERROR", `sendProjectMessageForUploadedFile: Undefined projectInfo for pk = ${projectFile.PROJECT_ID}`)
    const project = projectInfo.project

    const now = utils.now()

    // If the deadline has passed or there is less than one hour till the deadline
    if (project.DEADLINE < now || project.DEADLINE - now < 3600) {
        let trpr = ""
        if (project.PROJECT_TYPE === C_.ptTranslate && projectFile.FILE_TYPE === C_.pfTranslated) trpr = "translator"
        if ([C_.ptTranslateProofread, C_.ptProofread].includes(project.PROJECT_TYPE) && projectFile.FILE_TYPE === C_.pfProofread) trpr = "proofreader"

        if (!trpr) return

        const projectMessage = {
            table: "PROJECTS_MESSAGES",
            PROJECT_ID: project.PK,
            SENDER: "MT",
            RECIPIENT: "MT",
            IS_PROBLEM: true,
            MESSAGE: `The ${trpr} for project ${project.PROJECT_NUMBER} has uploaded a proofread file. This is urgent, as the client is waiting.`
        }
        insertLocalObject(projectMessage)
    }
}

async function sendEmailWithPaymentLink(projectID, amount) {
    const projectInfo = await getProjectInformation(projectID)
    if (!projectInfo) return log("ERROR", `sendEmailWithPaymentLink: Undefined projectInfo for pk = ${projectID}`)
    const project = projectInfo.project
    const division = projectInfo.division

    let services = ""
    const projectsServices = await db.getObjectsWithQuery(`SELECT * FROM PROJECTS_SERVICES WHERE PROJECT_ID = ${project.PK}`)
    for (let service of projectsServices) {
        if (service.IS_PAID || service.WAS_INITIAL) continue

        let serviceDetails = ""
        const cost = utils.roundPrice(service.COST)

        if (service.SERVICE_TYPE === C_.psCertification) serviceDetails = "Certification - $ " + cost
        if (service.SERVICE_TYPE === C_.psNotarization) serviceDetails = "Notarization - $ " + cost
        if (service.SERVICE_TYPE === C_.psDocumentChanges) serviceDetails = "Additional changes to your document - $ " + cost
        if (service.SERVICE_TYPE === C_.psExtraCopies) serviceDetails = `Extra copies ( ${service.ITEM_COUNT} ) - $ ` + cost
        if (service.SERVICE_TYPE === C_.psShipping) serviceDetails = "Shipping - $ " + cost
        if (service.SERVICE_TYPE === C_.psDigitalCertification) serviceDetails = "Digital certification - $ " + cost
        if (service.SERVICE_TYPE === C_.psDMVForm) serviceDetails = "DMV form - $ " + cost

        if (serviceDetails) services += serviceDetails + "\n\n"
    }

    const isNC = project.IS_NOTARIZED || project.IS_CERTIFIED

    let code = `PAYSS-${project.PK}|${amount}|${project.CURRENCY}${isNC ? "|" + project.PROJECT_NUMBER : ""}`
    code = Buffer.from(code).toString("base64")

    const paymentLink =
        `http://${division.EMAIL.replace("info@", "www.")}/charge-in-advance/?params=${code}` +
        utils
            .md5(`PAYSS-${project.PK}-${amount}-${project.CURRENCY}${isNC ? "-" + project.PROJECT_NUMBER : ""}-tranwise_secret_key`)
            .slice(0, 7)
            .toLowerCase()

    sendTemplateEmail("REQUEST_PAYMENT_FOR_SERVICES", division, division.EMAIL, project.PROJECT_EMAIL, {
        services: services,
        project_number: project.PROJECT_NUMBER,
        payment_link: paymentLink
    })
}

async function sendInvoice(invoiceID, email, comments, isFullyPrepaid) {
    const info = await createPDFInvoice(invoiceID)
    const invoice = info.invoice || {}

    if ((comments || "").trim()) comments = `\n\n${comments}\n\n`

    let monthString = ""
    if (invoice.MONTH > 0 && invoice.MONTH <= 12 && invoice.YEAR > 0) monthString = C_.longMonthNames[invoice.MONTH] + " " + invoice.YEAR

    let emailType = invoice.IS_MONTHLY ? "INVOICE_MONTHLY" : "INVOICE"
    if (isFullyPrepaid) emailType = "INVOICE_PREPAYMENT"
    sendTemplateEmail(
        emailType,
        info.division,
        info.division.EMAIL,
        email || info.email,
        {
            invoice_number: info.invoiceNumber,
            client_order_number: info.clientOrderNumber,
            project_number: info.projectNumber,
            month: monthString,
            link_for_tranwiseweb: linkForPortal(invoice.CLIENT_ID),
            comments: comments
        },
        info.documentPath
    )
}

async function sendProformaInvoice(projectID, email, comments) {
    const project = await db.getFullObject(projectID, "PROJECTS")
    if (!project) return log("ERROR", `sendProformaInvoice: undefined project for PK = ${projectID}`)

    const info = await createPDFInvoice(null, project.CLIENT_ID, project.PK, true) // Create the proforma invoice

    if ((comments || "").trim()) comments = `\n\n${comments}\n\n`

    sendTemplateEmail(
        "PROFORMA_INVOICE",
        info.division,
        info.division.EMAIL,
        email || info.email,
        {
            invoice_number: info.invoiceNumber,
            client_order_number: info.clientOrderNumber,
            comments: comments
        },
        info.documentPath
    )

    if (project.REQUIRED_PREPAYMENT_PERCENT < 100)
        sendEmail(
            info.division.EMAIL.replace("info@", "invoices@"),
            info.division.EMAIL.replace("info@", "invoices@"),
            "Proforma Invoice " + info.invoiceNumber + " ( " + project.REQUIRED_PREPAYMENT_PERCENT + " % )",
            "Proforma Invoice " + info.invoiceNumber + " ( " + project.REQUIRED_PREPAYMENT_PERCENT + " % )",
            info.documentPath
        )
}

function linkForPortal(clientID) {
    // At the moment, this linkForPortal still returns the link to the tranwiseweb.com website.
    // When switching to the new portal on translate-company.com, this line should be removed
    // and the two lines below should be uncommented to generate the link to the new portal.
    // return linkForTranwiseWeb("viewInvoices", clientID)

    const code = utils.md5("TranwiseClientsVersionSecurityCode!" + clientID) + clientID
    return "https://translate-company.com/Clients/" + code
}

function linkForTranwiseWeb(page, clientID, id) {
    let code = ("000000" + clientID).slice(-6) + "TranwiseWeb"
    code = Buffer.from(code).toString("base64").replace(/=/g, "")
    code = code.substring(15, 20) + code.substring(10, 15) + code.substring(5, 10) + code.substring(0, 5) + code.substring(20)

    let result = `http://www.tranwiseweb.com/${page}.php?code=${code}`
    if (id) result += "&id=" + id

    return result
}

function languageWithID(languageID) {
    const language = languages[languageID]
    return language ? language.LANGUAGE : ""
}

function testAction() {}

function processAPIRequest(message, data) {
    if (message === "InsertObject") insertLocalObject(data)
    if (message === "UpdateObject") sendLocalMessage("UPDATE_OBJECT", data.pk, data.table, data.field, data.value)
    if (message === "AddTranslationReply") addTranslationReply(data)
    if (message === "AddEmployeeHoliday") addEmployeeHoliday(data)
    if (message === "CreateSalesAccount") createSalesAccount(data)
    if (message === "CreatePrequote") createPrequote(data)
    if (message === "AddOCRFile") addOCRFile(data)
    if (message === "ClientConfirmedNotarizedProjectFile") clientConfirmedNotarizedProjectFile(data)
    if (message === "ClientCommentsForNotarizedProjectFile") clientCommentsForNotarizedProjectFile(data)
    if (message === "ClientCancelQuote") clientCancelQuote(data)
    if (message === "TemplatesQuote") createTemplatePrequote(data)
    if (message === "TemplatesFileReady") templatesFileReady(data)
    if (message === "TemplatesFileApproved") templatesFileApproved(data)
    if (message === "ProjectSupport") sendProjectMessageFromProjectSupport(data)
    if (message === "SendTwilioMessage") sendTwilioMessageFromProjectSupport(data)
    if (message === "AddRating") addEmployeeRating(data)
    if (message === "AddAIQuote") addAIQuote(data)
}

async function addTranslationReply(data) {
    if (!data.reply || !data.employeeID || !data.subprojectID) return

    const translations = await db.getObjectsWithQuery(
        `SELECT * FROM TRANSLATIONS WHERE EMPLOYEE_ID = ${db.escape(data.employeeID)} AND SUBPROJECT_ID = ${db.escape(data.subprojectID)}`
    )

    // If we already have a reply from this translator, update their reply
    for (let translation of translations) {
        updateObject(translation.PK, "TRANSLATIONS", "REPLY", data.reply)
        updateObject(translation.PK, "TRANSLATIONS", "REPLY_COMMENTS", data.comments || "")
    }

    if (translations.length) return

    // Otherwise insert the reply
    const translation = {
        table: "TRANSLATIONS",
        SUBPROJECT_ID: data.subprojectID,
        EMPLOYEE_ID: data.employeeID,
        REPLY: data.reply,
        REPLY_COMMENTS: data.comments || ""
    }
    insertLocalObject(translation)
}

// This function processes requests to the /ProjectSupport API sent from the project-support page on the UTS website
async function sendProjectMessageFromProjectSupport(data) {
    let projectID = 0
    // Try to find the project that has the project number provided with the request
    let project = await db.getObjectWithQuery(`SELECT PK FROM PROJECTS WHERE PROJECT_NUMBER = ${db.escape(data.PROJECT_NUMBER)} LIMIT 1`)
    if (!project) project = await db.getObjectWithQuery(`SELECT PK FROM PROJECTS WHERE PROJECT_NUMBER LIKE ${db.escape("%-" + data.PROJECT_NUMBER)} LIMIT 1`)
    if (project && project.PK) projectID = project.PK

    data.MESSAGE = (data.MESSAGE || "").replace(/&#13;/g, "\n")
    const messageText = `=== Message from Online Support on ${utils.nowAsString()} ===\n\n${data.MESSAGE}`
    const projectMessage = {
        table: "PROJECTS_MESSAGES",
        PROJECT_ID: projectID,
        SENDER: "OS",
        RECIPIENT: data.RECIPIENT,
        MESSAGE: messageText,
        IS_PROBLEM: true
    }
    insertLocalObject(projectMessage)
}

async function addEmployeeHoliday(data) {
    const employee = await db.getFullObject(data.employeeID, "EMPLOYEES")
    if (!employee) return

    const fromDateItems = (data.fromDate || "").split("-")
    if (fromDateItems.length != 3) return
    const fromDate = new Date(parseInt(fromDateItems[2], 10), parseInt(fromDateItems[1], 10) - 1, parseInt(fromDateItems[0], 10), 12, 0, 0, 0)

    const toDateItems = (data.toDate || data.fromDate || "").split("-")
    if (toDateItems.length != 3) return
    const toDate = new Date(parseInt(toDateItems[2], 10), parseInt(toDateItems[1], 10) - 1, parseInt(toDateItems[0], 10), 12, 0, 0, 0)

    const publicHolidays = await db.getObjectsWithQuery("SELECT * FROM EMPLOYEES_HOLIDAYS WHERE EMPLOYEE_ID = 0")
    const employeeHolidays = await db.getObjectsWithQuery(`SELECT * FROM EMPLOYEES_HOLIDAYS WHERE EMPLOYEE_ID = ${db.escape(data.employeeID)}`)

    let addedHolidays = 0
    for (let d = fromDate; d <= toDate; d.setDate(d.getDate() + 1)) {
        if ([0, 6].includes(d.getDay())) continue

        const timestamp = utils.getTimestamp(d.getFullYear(), d.getMonth() + 1, d.getDate())
        let foundHoliday = false
        for (let publicHoliday of publicHolidays) if (publicHoliday.DATE === timestamp) foundHoliday = true
        for (let employeeHoliday of employeeHolidays) if (employeeHoliday.DATE === timestamp) foundHoliday = true
        if (foundHoliday) continue

        const newHoliday = {
            table: "EMPLOYEES_HOLIDAYS",
            EMPLOYEE_ID: data.employeeID,
            DATE: timestamp,
            IS_HALF_DAY: (data.fromDate === data.toDate || !data.toDate) && data.isHalfDay
        }

        insertLocalObject(newHoliday)

        // Don't add more that 30 days, as that's probably an error
        if (addedHolidays++ > 30) break
    }

    if (utils.isValidEmail(employee.EMAIL) && addedHolidays > 0) {
        let text = "Your holiday for " + data.fromDate
        if (data.toDate) text += " to " + data.toDate
        if (data.isHalfDay && !data.toDate) text += " (half day)"
        text += " has been approved"
        sendEmail(settings("RECRUITMENT_EMAIL"), employee.EMAIL, text, text)
    }
}

// This function processes requests to the /SendTwilioMessage API sent from the project-support page on the UTS website
async function sendTwilioMessageFromProjectSupport(data) {
    sendTwilioSMS(data.PHONE_NUMBER, data.MESSAGE)
}

// This function is called when the API gets notified that a client has approved the file
// for a template-based project
async function templatesFileApproved(data) {
    const project = await db.getObjectWithQuery(`SELECT * FROM PROJECTS WHERE WEBSITE_ORDER_ID = '${data.orderid}_${data.itemid}'`)
    if (!project) return log("ERROR", `TemplatesFileApproved: Project not found for order ${data.orderid}_${data.itemid}`)

    const clientDivision = await db.getObjectWithQuery(`SELECT DIVISION_ID FROM CLIENTS WHERE PK = ${project.CLIENT_ID}`)
    if (!clientDivision) return log("ERROR", `TemplatesFileApproved: Client not found for order ${data.orderid}_${data.itemid}`)

    const division = divisions[clientDivision.DIVISION_ID]
    if (!division) return log("ERROR", `TemplatesFileApproved: Division not found for order ${data.orderid}_${data.itemid}`)

    // Prepare a message for the management team (and update it below if needed)
    let messageText = `The client for template-based project ${project.PROJECT_NUMBER} has approved the file and they received a link where they can download the final file from. You may complete the project.`

    // If the project is notarized or certified, update the message for the management team
    if (project.IS_NOTARIZED || project.IS_CERTIFIED)
        messageText = `The client for template-based project ${project.PROJECT_NUMBER} has approved the file. Please perform the certification / notarization and send it to the client. After that, you may complete the project.`
    // otherwise send the download link to the final file to the client
    else
        sendTemplateEmail("FINAL_FILE_FOR_TEMPLATE_PROJECT", division, division.EMAIL, project.PROJECT_EMAIL, {
            download_link: data.downloadurl,
            email_footer: division.EMAIL_SIGNATURE
        })

    // Send a message to the manager to inform them that the file has been approved by the client
    const projectMessage = {
        table: "PROJECTS_MESSAGES",
        PROJECT_ID: project.PK,
        SENDER: "MT",
        RECIPIENT: "MT",
        MESSAGE: messageText,
        IS_PROBLEM: true
    }
    insertLocalObject(projectMessage)
}

// This function is called when the API gets notified that a translator has finished editing
// the file for a template-based project
async function templatesFileReady(data) {
    const project = await db.getObjectWithQuery(`SELECT PK, PROJECT_NUMBER FROM PROJECTS WHERE WEBSITE_ORDER_ID = '${data.orderid}_${data.itemid}'`)
    if (!project) return log("ERROR", `TemplatesFileReady: Project not found for order ${data.orderid}_${data.itemid}`)

    // Add a final file to the project, which the managers can send to the client for checking
    const projectFile = {
        table: "PROJECTS_FILES",
        PROJECT_ID: project.PK,
        EMPLOYEE_ID: 0,
        FILE_TYPE: C_.pfFinal,
        FILE_NAME: "Final edited template only available in the online editor",
        CONTENTS: "NOT_NC",
        SIZE: 0,
        ONLINE_EDITOR_LINK: data.reviewurl,
        CONTENTS_OTHER: "TEMPLATE_FILE"
    }
    insertLocalObject(projectFile)

    // Send a message to the manager to inform them that the file has been edited.
    const messageText = `The translator for project ${project.PROJECT_NUMBER} is ready with editing the template. A final (for checking) file has been added to the project. Please go to the project, open the file in the online editor, check it, and then ask the client to check the file.`
    const projectMessage = {
        table: "PROJECTS_MESSAGES",
        PROJECT_ID: project.PK,
        SENDER: "MT",
        RECIPIENT: "MT",
        MESSAGE: messageText,
        IS_PROBLEM: true
    }
    insertLocalObject(projectMessage)
    
    const projectInfo = await getProjectInformation(project.PK)
    if (!projectInfo) return log("ERROR", `sendEmailWithType: ASK_CLIENT_FOR_REVIEW - Undefined projectInfo for pk = ${project.PK}`)    
    const projectInfoProject = projectInfo.project
    const division = projectInfo.division
    sendTemplateEmail("ASK_CLIENT_FOR_REVIEW", division, division.EMAIL, projectInfoProject.PROJECT_EMAIL, {}, null, { bcc: settings("TRUSTPILOT_BCC_EMAIL") })
}

async function createTemplatePrequote(data) {
    let clientID

    // First check if a client with this email already exists in the database, to use it
    if (typeof data.email === "string" && data.email) {
        const potentialClients = await db.getObjectsWithQuery(`SELECT PK FROM CLIENTS WHERE LOWER(EMAILS) = ${db.escape(data.email.toLowerCase())} ORDER BY PK DESC`)
        if (potentialClients.length) clientID = potentialClients[0].PK
    }

    // If we didn't find a client, create it
    if (!clientID) {
        const shipping = data.shipping || {}
        let address = shipping.address_1 || ""
        if (address) address += "\n"
        if (data.address_2) address += shipping.address_2 + "\n"
        address += shipping.city + ", " + shipping.state + " " + shipping.postcode

        let countryID = 241 // Default to USA
        if (shipping.country) for (let country of Object.values(countries)) if (country.CODE2 === shipping.country) countryID = country.PK

        const client = {
            table: "CLIENTS",
            CLIENT_NAME: data.name,
            DIVISION_ID: data.division,
            EMAILS: data.email,
            ADDRESS: address,
            COUNTRY_ID: countryID,
            REQUIRES_PREPAYMENT: true,
            PRICE: 0.1,
            CURRENCY: "USD",
            SOURCE: 5
        }

        const insertedClient = await insertLocalObjectPromise(client)
        if (!insertedClient) return

        clientID = insertedClient.PK
    }

    function convertLanguage(language) {
        if (language === "Chinese_Simplified") return "Chinese"
        if (language === "Chinese_Traditional") return "Chinese"
        if (language === "English_US") return "English"
        if (language === "Quebecois") return "French"
        if (language === "Swiss_German") return "German"
        if (language === "Irish_Gaelic") return "Gaelic"
        if (language === "Portuguese_Brazil") return "Portuguese (Brazil)"
        if (language === "Spanish_Latin_America") return "Spanish"
        if (language === "Spanish_US") return "Spanish"
        if (language.includes(" ( ")) return language.slice(0, language.indexOf(" ( "))
        return language
    }

    // Insert a prequote for each file in the items array
    for (let item of data.items) {
        // First get the link to the template editor for each file
        let url = `http://translation-editor.tranwise.com/docs/cloned/${data.orderid}/${item.item_id}`
        if (item.file_url && item.file_url.content && item.file_url.content.uuid) url = `http://translation-editor.tranwise.com/docs/cloned/${item.file_url.content.uuid}`

        let templateEditorLink = ""
        const response = await sendHTTPGetRequest(url)
        if (response && !response.error && response.content && response.content.editorUrl) templateEditorLink = response.content.editorUrl
        else log("ERROR", `Template editor: Bad response from ${url}: ${response && response.error ? response.error : response}`)

        const prequote = {
            table: "PREQUOTES",
            CLIENT_ID: clientID,
            PROJECT_EMAIL: data.email,
            SOURCE_LANGUAGE: convertLanguage(item.source_language),
            TARGET_LANGUAGES: convertLanguage(item.target_language),
            COMMENTS: `This project involves editing a ${item.certificate_type} template from ${item.country}.\n\nLanguage pair: ${item.source_language} -> ${item.target_language}`,
            IS_CERTIFIED: true,
            IS_NOTARIZED: (item.notar || "").includes("Yes"),
            HAS_DIGITAL_CERTIFICATION: (item.digi_cert || "").includes("Yes"),
            WEBSITE_ORDER_ID: data.orderid + "_" + item.item_id,
            PRICE: parseFloat(item.price),
            CLIENT_ORDER_NUMBER: item.product_name,
            TEMPLATE_EDITOR_LINK: templateEditorLink
        }
        if (data.payment_method) {
            prequote.PAYMENT_METHOD = data.payment_method
            prequote.TRANSACTION_ID = data.transaction_id
            prequote.PAYMENT_DATE = utils.now()
            prequote.PAYMENT_TOTAL_PRICE = parseFloat(data.total)
        }
        insertLocalObject(prequote)
    }
}

async function createPrequote(data) {
    let clientID

    if (typeof data.EMAILS === "string" && data.EMAILS) {
        // First check if a client with this email already exists in the database, to use it
        const potentialClients = await db.getObjectsWithQuery(`SELECT PK FROM CLIENTS WHERE LOWER(EMAILS) = ${db.escape(data.EMAILS.toLowerCase())} ORDER BY PK DESC`)
        if (potentialClients.length) clientID = potentialClients[0].PK
    }

    // If we didn't find a client, create it
    if (!clientID) {
        const client = {
            table: "CLIENTS",
            CLIENT_NAME: data.CLIENT_NAME,
            DIVISION_ID: data.DIVISION_ID,
            EMAILS: data.EMAILS,
            ADDRESS: data.ADDRESS || "",
            COUNTRY_ID: data.COUNTRY_ID,
            REQUIRES_PREPAYMENT: true,
            PRICE: 0.1,
            CURRENCY: "USD",
            SOURCE: 5
        }

        const insertedClient = await insertLocalObjectPromise(client)
        if (!insertedClient) return log("ERROR", "createPrequote: could not create client", true)

        clientID = insertedClient.PK
    }

    // Prepare the prequote
    const prequote = {
        table: "PREQUOTES",
        CLIENT_ID: clientID,
        PROJECT_EMAIL: data.PROJECT_EMAIL,
        SOURCE_LANGUAGE: data.SOURCE_LANGUAGE,
        TARGET_LANGUAGES: data.TARGET_LANGUAGES,
        COMMENTS: data.COMMENTS,
        IS_CERTIFIED: data.IS_CERTIFIED,
        IS_NOTARIZED: data.IS_NOTARIZED,
        HAS_DIGITAL_CERTIFICATION: data.HAS_DIGITAL_CERTIFICATION,
        FILES_DATA: data.FILES_DATA,
        FILE_URLS: data.FILE_URLS
    }
    if (data.payment_method) {
        prequote.PAYMENT_METHOD = data.payment_method
        prequote.TRANSACTION_ID = data.transaction_id
        prequote.PAYMENT_DATE = utils.now()
    }

    // Set the information for attached files
    if (data.FILES_DATA) {
        const files = data.FILES_DATA.split("|")
        let filesInfo = ""
        for (let file of files) {
            if (!(await utils.fileExists(file))) {
                log("PREQUOTES", "createPrequote: File not found: " + file, true)
                continue
            }

            const stats = fs.statSync(file)
            const fileSize = stats ? stats.size : -1

            const uniqueID = utils.getUniqueID()
            const copyResult = await utils.copyFile(file.replace(/\//g, "\\"), config.storeFolder + "Files/TEMP/" + uniqueID)
            if (!copyResult) log("ERROR", "createPrequote: Could not copy file from " + file, true)

            utils.deleteFile(file.replace(/\//g, "\\"))

            filesInfo += path.basename(file) + "|" + uniqueID + "|" + fileSize + ";"
        }
        prequote.FILES_DATA = filesInfo.slice(0, -1)
    }

    // Insert the prequote
    insertLocalObject(prequote)
}

async function addOCRFile(data) {
    const filePath = (data.FILE_PATH || "").replace(/\//g, "\\")
    if (!(await utils.fileExists(filePath))) return log("ERROR", "addOCRFile: File not found: " + filePath, true)

    const stats = fs.statSync(filePath)
    const fileSize = stats ? stats.size : -1

    const fileName = path.basename(filePath)

    const projectFile = {
        table: "PROJECTS_FILES",
        PROJECT_ID: data.PROJECT_ID,
        EMPLOYEE_ID: data.EMPLOYEE_ID,
        FILE_TYPE: C_.pfMain,
        FILE_NAME: fileName,
        CONTENTS: "OCR",
        SIZE: fileSize
    }

    if (data.wordCount) projectFile.CONTENTS = "OCR-" + data.wordCount

    const insertedFile = await insertLocalObjectPromise(projectFile)
    if (!insertedFile) return

    const finalPath = projectFilePath(fileName, insertedFile.PK)
    const copyResult = await utils.copyFile(filePath, finalPath)
    if (!copyResult) log("ERROR", "addOCRFile: Could not copy file from " + filePath, true)

    utils.deleteFile(filePath)
}

async function createSalesAccount(data) {
    const expectedFields = {
        username: "string",
        password: "string",
        firstName: "string",
        lastName: "string",
        email: "string",
        phoneNumber: "string",
        company: "string",
        divisionID: "number"
    }

    for (let [field, type] of Object.entries(expectedFields)) if (typeof data[field] != type) return

    if (!data.username.trim() || !data.password.trim() || !data.firstName.trim() || !data.lastName.trim() || !data.email.trim()) return

    if (!/^[0-9a-zA-Z._@-]{0,50}$/.test(data.username)) return

    const existingUsernames = await db.getObjectsWithQuery(`SELECT PK FROM EMPLOYEES WHERE USERNAME = ${db.escape(data.username)}`)
    if (existingUsernames.length) return

    data.firstName = data.firstName.replace(/[\n\r\t]/g, " ")
    data.lastName = data.lastName.replace(/[\n\r\t]/g, " ")
    data.email = data.email.replace(/[\n\r\t]/g, " ")

    // Compute the password hash
    const firstHash = utils.md5(data.password.trim().slice(0, 50) + "2147483648")
    const secondHash = utils.md5(firstHash + "TranwisePasswordDoubleHashSalt-$*")

    const newEmployee = {
        table: "EMPLOYEES",
        EMPLOYEE_TYPE: 4, // C_.etSales
        USERNAME: data.username.trim().slice(0, 50),
        PASSWORD: data.password.trim().slice(0, 50),
        PASSWORD_HASH: secondHash,
        FIRST_NAME: data.firstName.trim().slice(0, 50),
        LAST_NAME: data.lastName.trim().slice(0, 50),
        EMAIL: data.email.trim().slice(0, 90),
        PHONE_NUMBER: data.phoneNumber.trim().slice(0, 20),
        COMPANY: data.company.trim().slice(0, 50),
        AFFILIATE_RATE_EUR: 0.01,
        AFFILIATE_RATE_USD: 0.02,
        AFFILIATE_RATE_FIXED_PERCENT: 15,
        AFFILIATE_DIVISION_ID: data.divisionID
    }

    // Insert the employee
    db.insertObject(
        newEmployee,
        () => {},
        () => {
            log("ERROR", "Sales account registration error", true)
        }
    )
}

async function clientConfirmedNotarizedProjectFile(data) {
    if (!data.PROJECT_FILE_ID) return
    const projectFile = await db.getObjectWithQuery(`SELECT * FROM PROJECTS_FILES WHERE PK = ${data.PROJECT_FILE_ID}`)
    if (!projectFile) return log("ERROR", `clientConfirmedNotarizedProjectFile: Project file not found for PK = ${data.PROJECT_FILE_ID}`)

    const projectInfo = await getProjectInformation(projectFile.PROJECT_ID)
    if (!projectInfo) return log("ERROR", `clientConfirmedNotarizedProjectFile: Undefined projectInfo for pk = ${projectFile.PROJECT_ID}`)
    const project = projectInfo.project
    const division = projectInfo.division

    if (!project.TWILIO_STATUS)
        sendTemplateEmail("CONFIRMATION_AFTER_APPROVING_TRANSLATION", division, division.EMAIL, project.PROJECT_EMAIL, {
            project_number: project.PROJECT_NUMBER
        })

    let edited = ""
    if (data.EDITED === 1) edited = "The client EDITED the file. "
    if (data.EDITED === 0) edited = "The client DID NOT EDIT the file. "

    const message =
        `The client has approved the translated file "${projectFile.FILE_NAME}" for notarized / certified project ${project.PROJECT_NUMBER} in TranwiseWeb. ${edited}` +
        "Please go to the deliveries page in Tranwise, right-click on the final file you have uploaded and select Mark file as approved by the client."

    const projectMessage = {
        table: "PROJECTS_MESSAGES",
        PROJECT_ID: project.PK,
        SENDER: "CL",
        RECIPIENT: "MT",
        MESSAGE: message,
        PREVIEW: "The client has approved...",
        IS_PROBLEM: true,
        metadata: {
            PROJECT_NUMBER: project.PROJECT_NUMBER
        }
    }

    insertLocalObject(projectMessage)
    updateObject(projectFile.PK, "PROJECTS_FILES", "CLIENT_APPROVAL_STATUS", data.EDITED === 1 ? C_.casEdited : C_.casApproved)
}

async function clientCommentsForNotarizedProjectFile(data) {
    if (!data.PROJECT_FILE_ID) return
    const projectFile = await db.getObjectWithQuery(`SELECT * FROM PROJECTS_FILES WHERE PK = ${data.PROJECT_FILE_ID}`)
    if (!projectFile) return log("ERROR", `clientCommentsForNotarizedProjectFile: Project file not found for PK = ${data.PROJECT_FILE_ID}`)

    const projectInfo = await getProjectInformation(projectFile.PROJECT_ID)
    if (!projectInfo) return log("ERROR", `clientCommentsForNotarizedProjectFile: Undefined projectInfo for pk = ${projectFile.PROJECT_ID}`)
    const project = projectInfo.project

    updateObject(projectFile.PK, "PROJECTS_FILES", "CLIENT_APPROVAL_STATUS", C_.casNotApproved)
    updateObject(project.PK, "PROJECTS", "CLIENT_APPROVAL_STATUS", 1)

    const text =
        `The client had comments for file "${projectFile.FILE_NAME}" of project ${project.PROJECT_NUMBER}. They were sent automatically to the translator and the proofreader.` +
        `\n\n===================\n\n${data.MESSAGE}`

    // Send the message to the managers
    const projectMessage = {
        table: "PROJECTS_MESSAGES",
        PROJECT_ID: project.PK,
        SENDER: "CL",
        RECIPIENT: "MT",
        MESSAGE: text,
        IS_PROBLEM: true,
        metadata: {
            PROJECT_NUMBER: project.PROJECT_NUMBER
        }
    }
    insertLocalObject(projectMessage)

    // Send the client's message to all translators working on this project
    const subprojects = await db.getObjectsWithQuery(`SELECT * FROM SUBPROJECTS WHERE PROJECT_ID = ${project.PK}`)
    if (!subprojects.length) return

    const subprojectsPKs = subprojects.map(subproject => subproject.PK).join(",")
    const translations = await db.getObjectsWithQuery(
        `SELECT PK, SUBPROJECT_ID, EMPLOYEE_ID FROM TRANSLATIONS WHERE STATUS IN (${C_.tsTranslating}, ${C_.tsProofreading}) AND SUBPROJECT_ID IN (${subprojectsPKs})`
    )

    for (let translation of translations) {
        const text =
            `The client had comments for file "${projectFile.FILE_NAME}" of project ${project.PROJECT_NUMBER}. Please make sure that you apply the changes requested by the client on the Final Version of the translated / proofread file, that was sent to the client. If you cannot access the final file, please ask the project manager or the delivery team for it. Thank you!` +
            `\n\n===================\n\n${data.MESSAGE}`

        const projectMessage = {
            table: "PROJECTS_MESSAGES",
            PROJECT_ID: project.PK,
            SUBPROJECT_ID: translation.SUBPROJECT_ID,
            TRANSLATION_ID: translation.PK,
            SENDER: "CL",
            RECIPIENT: translation.EMPLOYEE_ID,
            MESSAGE: text,
            IS_PROBLEM: true,
            metadata: {
                PROJECT_NUMBER: project.PROJECT_NUMBER
            }
        }
        insertLocalObject(projectMessage)
    }
}

async function clientCancelQuote(data) {
    const project = await db.getFullObject(data.PROJECT_ID, "PROJECTS")
    if (!project) log("ERROR", "clientCancelQuote: project is undefined for PK = " + data.PROJECT_ID, true)

    if (project.STATUS != C_.psQuote) return

    const message = "Cancelled by the client in TranwiseWeb:\n\n" + (data.MESSAGE || "")
    updateObject(project.PK, "PROJECTS", "CANCEL_REASON", message)
    updateObject(project.PK, "PROJECTS", "STATUS", C_.psCancelled)
    updateObject(project.PK, "PROJECTS", "WORKING_MANAGER_ID", 0)
}

// Timed action
async function sendDailyEmailToNewTranslators() {
    log("GLOBAL", "Sending daily emails to translators", true)

    const now = utils.now()
    const employees = await db.getObjectsWithQuery(`SELECT PK,EMAIL,ACCEPTED_DATE FROM EMPLOYEES WHERE ACCEPTED_DATE > ${now - 3600 * 24 * 8}`)
    for (let employee of employees) {
        const days = Math.floor((now - employee.ACCEPTED_DATE) / (3600 * 24))
        if (days >= 0 && days < 6 && utils.isValidEmail(employee.EMAIL)) {
            sendTemplateEmail(`NEW_TRANSLATOR_DAILY_EMAIL_${days + 2}`, null, settings("RECRUITMENT_EMAIL"), employee.EMAIL)
        }
    }
}

// Timed action
async function sendDailyInvoiceReminders() {
    log("GLOBAL", "Sending daily invoice reminders", true)

    const invoices = await db.getObjectsWithQuery(
        "SELECT INVOICES.PK, CLIENT_ID, INVOICE_DATE FROM INVOICES INNER JOIN clients ON client_id = clients.pk AND STATUS = 0 AND clients.hold_reminders = 0 AND DATE(adddate(from_unixtime(invoice_date), if (payment_terms = 0, 30, payment_terms) + 5)) = DATE(NOW())"
    )

    for (let invoice of invoices) {
        // First insert the reminder object into the database
        const invoiceReminder = {
            table: "INVOICE_REMINDERS",
            INVOICE_ID: invoice.PK,
            DATE: utils.now()
        }
        insertLocalObject(invoiceReminder)

        const client = await db.getFullObject(invoice.CLIENT_ID, "CLIENTS")
        if (!client) log("ERROR", `sendDailyInvoiceReminders: undefined client for ID = ${invoice.CLIENT_ID}, invoice id = ${invoice.PK}`)

        const division = divisions[client.DIVISION_ID]
        if (!division) log("ERROR", `sendDailyInvoiceReminders: division is undefined for ID = ${client.DIVISION_ID}, clientID = ${client.PK}`)

        let email = ""
        if (utils.isValidEmail(client.EMAIL_FOR_INVOICES)) email = client.EMAIL_FOR_INVOICES

        const projects = await db.getObjectsWithQuery(`SELECT * FROM PROJECTS WHERE INVOICE_ID = ${invoice.PK}`)

        let totalPrice = 0
        let currency = ""
        let projectNumbers = ""
        let projectsString = ""
        for (let project of projects) {
            totalPrice += helper.totalCalculatedProjectPrice(project)
            if (!email) email = project.PROJECT_EMAIL
            if (!currency) currency = project.CURRENCY
            projectNumbers += project.PROJECT_NUMBER + ", "

            projectsString += `${project.PROJECT_NUMBER} (${project.CLIENT_ORDER_NUMBER}) -- `
            if (project.SOURCE_WORDS) projectsString += `${project.SOURCE_WORDS} source words -- `
            projectsString += `delivered on ${utils.formatDate(project.DATE_COMPLETED, "D/M/YYYY")}\n`
        }

        if (projectNumbers) projectNumbers = `(no. ${projectNumbers.slice(0, -2)})`
        if (!totalPrice) continue

        // 1 = good payer
        const emailType = client.PAYER_TYPE === 1 ? "INVOICE_REMINDER_FOR_GOOD_PAYERS" : "INVOICE_REMINDER"

        sendTemplateEmail(emailType, division, division.EMAIL, email, {
            invoice_number: helper.invoiceNumber(invoice),
            invoice_date: utils.formatDate(invoice.INVOICE_DATE, "D/M/YYYY"),
            invoice_amount: utils.roundPrice(totalPrice),
            currency: currency,
            link_for_tranwiseweb: linkForPortal(client.PK),
            projects_on_invoice: projectsString,
            project_numbers: projectNumbers
        })
    }
}

// Timed action
async function sendEmailAboutUpcomingProjects() {
    log("GLOBAL", "Sending email about upcoming projects", true)

    const projects = await db.getObjectsWithQuery(
        "SELECT PK,PROJECT_NUMBER,DEADLINE,DEADLINE_INTERMEDIATE,DEADLINE_REOPENED FROM PROJECTS WHERE" +
            ` STATUS IN (${C_.psPending}, ${C_.psTranslation}, ${C_.psProofreading}, ${C_.psCheckPhase}, ${C_.psReopened}) AND ( (DEADLINE - UNIX_TIMESTAMP(NOW())  <= 48 * 3600) OR (DEADLINE_INTERMEDIATE > 0 AND (DEADLINE_INTERMEDIATE - UNIX_TIMESTAMP(NOW())  <= 48 * 3600) ) ` +
            "OR (DEADLINE_REOPENED > 0 AND (DEADLINE_REOPENED - UNIX_TIMESTAMP(NOW()) <= 48 * 3600) ) ) ORDER BY (DEADLINE - UNIX_TIMESTAMP(NOW()))"
    )

    const results = []

    for (let project of projects) {
        let deadline = project.DEADLINE
        if (project.DEADLINE_REOPENED) deadline = project.DEADLINE_REOPENED
        else if (project.DEADLINE_INTERMEDIATE) deadline = project.DEADLINE_INTERMEDIATE

        results.push({
            projectNumber: `${project.PROJECT_NUMBER} ${project.DEADLINE_REOPENED ? " [R]" : ""}\t`,
            deadline
        })
    }

    results.sort((a, b) => a.deadline - b.deadline)

    let text = "The following projects are due in the next 48 hours:\n\n"
    for (let result of results) text += result.projectNumber + "\t\t" + utils.formatDate(result.deadline) + "\n"

    sendEmail(settings("SYSTEM_EMAIL"), "ramona@utstranslations.com", "Tranwise: Projects due in the next 48 hours", text)
}

// Timed action
async function sendOpenedProjectsReport() {
    log("GLOBAL", "Sending opened projects report", true)

    const projects = await db.getObjectsWithQuery(
        "SELECT PK,PROJECT_NUMBER,STATUS,DEADLINE,DEADLINE_REOPENED,SOURCE_LANGUAGE_ID,SOURCE_WORDS FROM PROJECTS WHERE" +
            ` STATUS IN (${C_.psPending}, ${C_.psTranslation}, ${C_.psProofreading}, ${C_.psCheckPhase}, ${C_.psReopened})`
    )

    const projectsPKs = projects.map(project => project.PK).join(",")
    const subprojects = await db.getObjectsWithQuery(`SELECT PROJECT_ID,LANGUAGE_ID FROM SUBPROJECTS WHERE PROJECT_ID IN (${projectsPKs})`)

    const results = []

    for (let project of projects) {
        let languages = ""
        for (let subproject of subprojects) if (subproject.PROJECT_ID === project.PK) languages += languageWithID(subproject.LANGUAGE_ID) + ", "

        let deadline = project.STATUS === C_.psReopened ? project.DEADLINE_REOPENED : project.DEADLINE

        results.push({
            text:
                `${project.PROJECT_NUMBER} ${project.DEADLINE_REOPENED ? " [R]" : ""}\t` +
                `${project.SOURCE_WORDS}\t` +
                `${utils.formatDate(deadline)}\t` +
                `${languageWithID(project.SOURCE_LANGUAGE_ID)}\t` +
                `${languages.slice(0, -2)}`,
            deadline
        })
    }

    results.sort((a, b) => a.deadline - b.deadline)

    const data = "PROJECT\tWORDS\tDEADLINE\tSOURCE\tTARGET\n\n" + results.map(result => result.text).join("\n")
    const filePath = config.storeFolder + "Reports/Open projects - " + utils.formatNow("DD-MM-YYYY") + ".xls"

    fs.writeFile(filePath, data, err => {
        if (err) return log("ERROR", "Error when saving file in sendOpenedProjectsReport: " + err)

        const subject = `Tranwise: Open projects - ${utils.formatNow("DD-MM-YYYY")}`
        const text = "Attached is a list with all the open projects and their deadlines."
        sendEmail(settings("SYSTEM_EMAIL"), "anita@wapatranslations.com", subject, text, filePath)
        sendEmail(settings("SYSTEM_EMAIL"), "info@nordictrans.com", subject, text, filePath)
        sendEmail(settings("SYSTEM_EMAIL"), "info@wapatranslations.com", subject, text, filePath)
        sendEmail(settings("SYSTEM_EMAIL"), "info@universal-translation-services.com", subject, text, filePath)
        sendEmail(settings("SYSTEM_EMAIL"), "info@isotranslations.com", subject, text, filePath)
        sendEmail(settings("SYSTEM_EMAIL"), "cecilia@utstranslations.com", subject, text, filePath)
    })
}

// Timed action
async function sendDeadlineReminders() {
    const translations = await db.getObjectsWithQuery(
        "SELECT TRANSLATIONS.PK AS PK, TRANSLATIONS.STATUS, PROJECT_NUMBER, DEADLINE_TRANSLATOR, DEADLINE_PROOFREADER, LANGUAGE_ID, EMAIL, UTC_OFFSET FROM TRANSLATIONS JOIN SUBPROJECTS ON SUBPROJECT_ID = SUBPROJECTS.PK JOIN PROJECTS ON PROJECT_ID = PROJECTS.PK JOIN EMPLOYEES ON EMPLOYEE_ID = EMPLOYEES.PK AND PROJECTS.STATUS IN (3, 4, 5, 6, 7) AND TRANSLATIONS.STATUS IN (1, 2) AND RECEIVED_REMINDER = 0 AND UPLOADED_ALL_FILES = 0"
    )

    for (let translation of translations) {
        let deadline = 0
        if (translation.STATUS === C_.tsTranslating) deadline = translation.DEADLINE_TRANSLATOR
        if (translation.STATUS === C_.tsProofreading) deadline = translation.DEADLINE_PROOFREADER
        if (!deadline) continue

        const minutes = Math.floor((deadline - utils.now()) / 60)
        if (minutes < 0 || minutes > 130) continue

        let deadlineString = ""
        if (translation.STATUS === C_.tsTranslating)
            deadlineString = "Deadline for translator: " + utils.formatDate(helper.dateWithUTCOffset(translation.DEADLINE_TRANSLATOR, translation.UTC_OFFSET))
        if (translation.STATUS === C_.tsProofreading)
            deadlineString = "Deadline for proofreader: " + utils.formatDate(helper.dateWithUTCOffset(translation.DEADLINE_PROOFREADER, translation.UTC_OFFSET))

        const text =
            "Dear translator,\n\n" +
            `This is a message to remind you that you need to complete and upload the ${translation.STATUS === C_.tsTranslating ? "translation" : "proofreading"}` +
            " for the following project:\n\n" +
            `Project number: ${translation.PROJECT_NUMBER} - ${languageWithID(translation.LANGUAGE_ID)}\n` +
            `${deadlineString}\n\n` +
            "It is very important for us to keep to the deadline. If you expect any problems, please login to Tranwise and use the report problem feature to let us know (you can find the link at the bottom of the Files page of the project). " +
            "If you are the proofreader and you feel that the translation is a bad translation please report it to us. This is important for you, us and the client.\n\n" +
            // eslint-disable-next-line quotes
            `If you have already uploaded your translation or proofreading, please mark it in Tranwise by using the checkbox "Select this after you have uploaded all the files you had to work on", found on the project's details page.\n\n` +
            "Thank you.\n" +
            "Best regards,\n" +
            "Universal Translation Services\n\n" +
            "--- Please do not reply to this email."

        if (utils.isValidEmail(translation.EMAIL))
            sendEmail(
                settings("RECRUITMENT_EMAIL"),
                translation.EMAIL,
                `Deadline reminder for project ${translation.PROJECT_NUMBER} - ${languageWithID(translation.LANGUAGE_ID)}`,
                text
            )

        updateObject(translation.PK, "TRANSLATIONS", "RECEIVED_REMINDER", true)
    }
}

// Timed action
async function resendPendingQuotes() {
    const now = utils.now()
    const projects1 = await db.getObjectsWithQuery(
        "SELECT PK FROM PROJECTS WHERE STATUS = 1 AND IS_QUOTE_SENT = 1 AND (IS_NOTARIZED > 0 OR IS_CERTIFIED > 0)" +
            ` AND DATE_RECEIVED > ${now - 3600 * 24 - 600} AND DATE_RECEIVED <= ${now - 3600 * 24}`
    )
    for (let project of projects1) sendEmailWithTypeForProject("QUOTE_NOTARIZED_CERTIFIED_REMINDER_1", project.PK)

    const projects2 = await db.getObjectsWithQuery(
        "SELECT PK FROM PROJECTS WHERE STATUS = 1 AND IS_QUOTE_SENT = 1 AND (IS_NOTARIZED > 0 OR IS_CERTIFIED > 0)" +
            ` AND DATE_RECEIVED > ${now - 3600 * 48 - 600} AND DATE_RECEIVED <= ${now - 3600 * 48}`
    )
    for (let project of projects2) sendEmailWithTypeForProject("QUOTE_NOTARIZED_CERTIFIED_REMINDER_2", project.PK)
}

// These reminders are not sent anymore
async function sendRemindersToCheckTranslation() {
    const projectsFiles = await db.getObjectsWithQuery(
        "SELECT PROJECTS_FILES.PK FROM PROJECTS_FILES JOIN PROJECTS ON PROJECT_ID = PROJECTS.PK AND PROJECTS.STATUS IN (4, 5, 6)" +
            " AND FILE_TYPE = 4 AND CONTENTS = 'NOT_NC' AND PROJECTS_FILES.CLIENT_APPROVAL_STATUS = 1"
    )

    for (let projectFile of projectsFiles) sendTranslatedFileForCheck(projectFile.PK, true)
}

// Timed action
function performDatabaseBackup() {
    execFile("C:/TranwiseServerDatabaseBackup/BackupTranwiseDatabase.bat", { cwd: "C:/TranwiseServerDatabaseBackup/" }, error => {
        if (error) log("ERROR", "Error in performDatabaseBackup: " + error)
    })
}

async function downloadFileFromURL(url, saveFolder) {
    const response = await axios({
        url,
        method: "GET",
        responseType: "stream"
    })

    let fileName = "Document.docx"
    const contentDisposition = response.headers["content-disposition"]
    if (contentDisposition) fileName = contentDisposition.substring(contentDisposition.indexOf("filename=") + 9).replace(/"/g, "")

    const writer = fs.createWriteStream(saveFolder + "/" + fileName)
    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on("finish", resolve)
        writer.on("error", reject)
    })
}

async function reloadEmailTemplates() {
    const data = await db.getFullObjects("EMAIL_TEMPLATES")
    for (let obj of data) emailTemplates[obj.EMAIL_TYPE] = obj
    log("GLOBAL", "=== Reloaded email templates")
}

async function reloadDivisions() {
    const data = await db.getFullObjects("DIVISIONS")
    for (let obj of data) divisions[obj.PK] = obj
    log("GLOBAL", "=== Reloaded divisions")
}

async function reloadLanguages() {
    const data = await db.getFullObjects("LANGUAGES")
    for (let obj of data) languages[obj.PK] = obj
    log("GLOBAL", "=== Reloaded languages")
}

async function reloadSettings() {
    const data = await db.getFullObjects("SETTINGS")
    for (let obj of data) settingsItems[obj.PARAMETER] = obj
    log("GLOBAL", "=== Reloaded settings")
}

async function addEmployeeRating(data) {
    try {
        const { PROJECT_NUMBER, SUBPROJECT_ID, rating, comments } = data
        const project = await db.getObjectWithQuery(`SELECT * FROM PROJECTS WHERE PROJECT_NUMBER = "${PROJECT_NUMBER}"`)
        if (!project) return log("ERROR", `addEmployeeRating: undefined project for PK = ${PROJECT_NUMBER}`)
        const subProject = await db.getFullObject(SUBPROJECT_ID, "SUBPROJECTS")
        if (!subProject) return log("ERROR", `addEmployeeRating: undefined subProject for PK = ${SUBPROJECT_ID}`)
        if (subProject.PROJECT_ID === project.PK) {
            let assignedTranslators = await db.getObjectsWithQuery(`SELECT EMPLOYEE_ID FROM TRANSLATIONS WHERE STATUS = 1 AND CONFIRMED = 1 AND SUBPROJECT_ID = ${SUBPROJECT_ID}`)
            await Promise.all(assignedTranslators.map(async (t) => {
                const emp = await db.getFullObject(t.EMPLOYEE_ID, "EMPLOYEES")
                let points = emp.PLUS_POINTS ? emp.PLUS_POINTS + rating : rating;
                 updateObject(t.EMPLOYEE_ID, "EMPLOYEES", "PLUS_POINTS", points)
                if (comments) {
                    let updatedComments = comments + " - " +  PROJECT_NUMBER + " ";
                    let comm = emp.POINTS_COMMENTS ? emp.POINTS_COMMENTS + '\n' + updatedComments: updatedComments;
                    updateObject(t.EMPLOYEE_ID, "EMPLOYEES", "POINTS_COMMENTS", comm)
                }
                const employeeRatingObject = {
                    table: "EMPLOYEE_RATINGS",
                    PROJECT_ID: project.PK,
                    SUBPROJECT_ID: subProject.PK,
                    EMPLOYEE_ID: t.EMPLOYEE_ID,
                    CLIENT_ID: project.CLIENT_ID,
                    RATING: rating,
                    COMMENTS: comments
                }
                insertLocalObject(employeeRatingObject)
                const message =
                    "Dear Translator,\n\n" +
                    `You have just received a ${rating} points in Tranwise for the following project ${PROJECT_NUMBER}, for the following reason:\n\n` +
                    comments +
                    `\n\n If you have any questions about this, please chat in Tranwise with one of the project managers.\n\n` +
                    "Regards,\nUniversal Translation Services"

                const employeeMessage = {
                    table: "EMPLOYEES_MESSAGES",
                    TO_ID: t.EMPLOYEE_ID,
                    FROM_ID: 238, // Anita's account ID
                    MESSAGE: message
                }
                insertLocalObject(employeeMessage)
                const managerMessage = `Translator ${emp.USERNAME} got ${rating} points for project ${PROJECT_NUMBER}.`
                const projectMessage = {
                    table: "PROJECTS_MESSAGES",
                    PROJECT_ID: project.PK,
                    SENDER: "MT",
                    RECIPIENT: 'FFT',
                    MESSAGE: managerMessage,
                    IS_PROBLEM: false
                }
                insertLocalObject(projectMessage)
            }));
            return
        } else {
            return log("ERROR", `addEmployeeRating: ${SUBPROJECT_ID} does not belong to project ${project.PK}`)
        }
    } catch (err) {
        console.log("Add rating ERROR", data)
    }
}

async function validateLanguages(lang) {
    const langPK = await getLanguageId(lang)
    return langPK || false;
}

async function addAIQuote(data) {
    try {
        //get language id
        const SOURCE_LANGUAGE_ID = await getLanguageId(data.SOURCE_LANGUAGE)
        let subprojects = [],
            subproject
        subproject = data.TARGET_LANGUAGES.map(async tl => {
            const LanguagesPK = await getLanguageId(tl)
            return subprojects.push({ table: "SUBPROJECTS", PROJECT_ID: 0, LANGUAGE_ID: LanguagesPK })
        })

        let clientID, clientEmail
        if (typeof data.emails === "string" && data.emails) {
            // First check if a client with this email already exists in the database, to use it
            const potentialClients = await db.getObjectsWithQuery(`SELECT PK, EMAILS FROM CLIENTS WHERE LOWER(EMAILS) = ${db.escape(data.emails.toLowerCase())} ORDER BY PK DESC`)
            if (potentialClients.length) {
                clientID = potentialClients[0].PK
                clientEmail = potentialClients[0].EMAILS
            }
        }
        // If we didn't find a client, create it
        if (!clientID) {
            const client = {
                table: "CLIENTS",
                CLIENT_NAME: data.emails,
                DIVISION_ID: data.DIVISION_ID || 7,
                EMAILS: data.emails,
                ADDRESS: data.ADDRESS || "",
                COUNTRY_ID: data.COUNTRY_ID,
                REQUIRES_PREPAYMENT: true,
                PRICE: 0.1,
                CURRENCY: "USD",
                SOURCE: 5
            }
            const insertedClient = await insertLocalObjectPromise(client)
            if (!insertedClient) return log("ERROR", "AddQuote: could not create client", true)

            clientID = insertedClient.PK
            clientEmail = insertedClient.EMAILS
        }

        let PROJECT_TYPE
        let AI_TRANSLATION_STATUS = 0

        switch (data.type) {
            case "human_trans_w_review":
                PROJECT_TYPE = C_.ptTranslateProofread
                break
            case "human_trans_wo_review":
                PROJECT_TYPE = C_.pfTranslated
                break
            case "artif_trans":
                AI_TRANSLATION_STATUS = 1
                PROJECT_TYPE = 0
                break
            default:
                PROJECT_TYPE = 0
        }

        let work_details = '';
        if (Array.isArray(data.subject) && data.subject.length) {
            work_details += `Insturctions: ${data.subject[0] || '' }`
        }
        if (data.delivery_time) {
            work_details += `\n`;
            work_details += `Requested delivery date: ${data.delivery_time}`;
        }

        await Promise.all(subproject)
        const PROJECTS = {
            table: "PROJECTS",
            AI_TRANSLATION_STATUS,
            STATUS: 1,
            CLIENT_ID: clientID,
            CURRENCY: "EUR",
            DEADLINE: 0,
            PRICE: parseFloat(data.price),
            PROJECT_TYPE,
            SOURCE_LANGUAGE_ID,
            SOURCE_WORDS: parseInt(data.word_count),
            children: [...subprojects],
            PROJECT_EMAIL: clientEmail,
            WORK_DETAILS: work_details
        }
        // Insert the prequote with file
        insertLocalObjectPromise(PROJECTS).then(async project => {
            console.log(project.PK, project.PROJECT_NUMBER, data.file)
            try {
                await downloadFileFromURLProject(data.file, project.PK)
            } catch (err) {
                // console.log('download file error');
            }
        })
    } catch (err) {
        console.log('err', err)
    }
}

async function downloadFileFromURLProject(url, ProjectPK) {
    const { data, headers } = await axios({
        url,
        method: "GET",
        responseType: "stream"
    })

    //store in temp first rename to real location
    const STORE_FOLDER = config.storeFolder
    const uniqueID = Date.now() + "_" + Math.random().toString().substring(2)
    const tempFileName = uniqueID
    var tempLocation = STORE_FOLDER + "Files/TEMP/" + tempFileName

    let fileName = path.basename(url)
    fileName = fileName.replace(/[<>:"/\\|?*\n\r\t]/g, "")
    const contentDisposition = headers["content-disposition"]
    if (contentDisposition) fileName = contentDisposition.substring(contentDisposition.indexOf("filename=") + 9).replace(/"/g, "")

    const writer = fs.createWriteStream(tempLocation)
    data.pipe(writer)
    await new Promise((resolve, reject) => {
        writer.on("finish", resolve)
        writer.on("error", reject)
    })

    //move to real location
    const fileSize = fs.statSync(tempLocation).size
    const fileInfo = {
        table: "PROJECTS_FILES",
        FILE_TYPE: C_.pfMain,
        FILE_NAME: fileName,
        SIZE: fileSize,
        PROJECT_ID: ProjectPK
    }
    insertLocalObjectPromise(fileInfo).then(projectfile => {
        let subfolder = ""
        subfolder = ("00000000" + projectfile.PK).slice(-8).slice(0, 4) + "0000/"
        const projectFolder = STORE_FOLDER + "Files/01_PROJECTS_FILES/" + subfolder
        utils.makeFolder(projectFolder)
        const finalLocation = projectFolder + ("00000000" + projectfile.PK).slice(-8) + "_" + fileName
        fs.rename(tempLocation, finalLocation, err => {
            if (err) log("ERROR", "File move ERROR: " + JSON.stringify(err))
        })
    })
}

function sendFileToAI(fileID, projectID, employeeID, fileName) {
    let inputFile = projectFilePath(fileName,fileID);
    let query = `SELECT PROJECTS.PK, SL.LANGUAGE AS LANGUAGE, SL.LANGUAGE_CODE as SOURCE_LANGUAGE_CODE ,
            TL.LANGUAGE AS TARGET ,TL.LANGUAGE_CODE as TARGET_LANGUAGE_CODE  FROM PROJECTS 
            JOIN LANGUAGES SL ON SOURCE_LANGUAGE_ID = SL.PK JOIN SUBPROJECTS ON PROJECT_ID = PROJECTS.PK 
            JOIN LANGUAGES TL ON LANGUAGE_ID = TL.PK   and PROJECT_ID = ${projectID}`

    return db.getObjectsWithQuery(query).then(project => {
        let languge = "";
        let target = [];
        project.forEach(p => {
            if (p.TARGET_LANGUAGE_CODE) {
                target.push(p.TARGET_LANGUAGE_CODE);
            }
            if (p.SOURCE_LANGUAGE_CODE) {
                languge = p.SOURCE_LANGUAGE_CODE;
            }
        })
        return Promise.all(target.map(targetLang => {
            let newFileName = "AI_" + targetLang + "_" + fileName;
            let tempFile = Date.now() + "_" + newFileName;
            return AITranslates.translate(inputFile, tempFile, languge, targetLang,fileID,fileName)
            .then(fileInfo => {
                const projectFile = {
                    table: "PROJECTS_FILES",
                    PROJECT_ID: projectID,
                    FILE_NAME: newFileName,
                    EMPLOYEE_ID: 0,
                    FILE_TYPE: 1,
                    SIZE: fileInfo.size || 0,
                    CLIENT_APPROVAL_STATUS: 0
                }
                return insertLocalObjectPromise(projectFile)
            })
            .then(data => {
                let outPutFile = projectFilePath(newFileName,data.PK);
                return AITranslates.rename(tempFile, outPutFile)
            })
        }))
    }).catch(error => {
        console.log(error);
    })
}

function readAllTwilioMsg() {
    let query = `UPDATE twilio_messages
                    set IS_ANSWERED = true
                    where IS_ANSWERED = FALSE`;
    return db.getObjectsWithQuery(query);
}

async function getLanguageId(language) {
    const Languages = await db.getObjectsWithQuery(`SELECT PK FROM LANGUAGES WHERE LOWER(LANGUAGE) = ${db.escape(language.toLowerCase())} ORDER BY PK DESC`)
    if (Languages.length) return Languages[0].PK
}

module.exports = {
    updateObject,
    insertLocalObject,
    performUpdateActions,
    performInsertActions,
    performDeleteActions,
    setMessageProcessor,
    setSocketManager,
    createMonthlyInvoices,
    createPaymentSheets,
    markPaymentSheetsAsPaid,
    generateMonthlyProjectsReport,
    savePaymentSheets,
    saveTurnover,
    getTurnoverAmountForMonth,
    getNewProjectDataForTranslators,
    sendOverdueInvoicesReminders,
    getPaymentSheetsHistory,
    processAPIRequest,
    processTranslatorRegistration,
    sendFileToOCR,
    resendSubprojectToTranslators,
    sendTelegramToEmployee,
    sendSMSToEmployee,
    unlockFileInOnlineEditor,
    sendEmail,
    sendCustomEmail,
    sendEmailWithTypeForProject,
    createFilesForNotarizedProject,
    settings,
    languages,
    projectFilePath,
    sendInvoice,
    sendProformaInvoice,
    createPDFInvoice,
    processChat,
    testAction,
    sendProjectFinalFile,
    sendProjectReopenedFile,
    sendEmailWithPaymentLink,
    sendDigitalCertificationOrNotarization,
    sendTranslatedFileForCheck,
    sendDailyEmailToNewTranslators,
    sendDailyInvoiceReminders,
    sendEmailAboutUpcomingProjects,
    sendOpenedProjectsReport,
    sendDeadlineReminders,
    resendPendingQuotes,
    sendRemindersToCheckTranslation,
    clientConfirmedNotarizedProjectFile,
    performDatabaseBackup,
    reloadEmailTemplates,
    reloadDivisions,
    reloadLanguages,
    reloadSettings,
    sendFileToAI,
    validateLanguages,
    readAllTwilioMsg
}
