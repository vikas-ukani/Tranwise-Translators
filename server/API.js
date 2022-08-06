const express = require("express")
const app = express()
const log = require("./Logger")
const { validateLanguages } = require("./ServerActions");
const port = 3399

// This is the script that processes the API calls for Tranwise.
// All the API requests are validated here and the processor is called with the final details
// that have to be integrated in the Tranwise server
let processor

function setProcessor(p) {
    processor = p
}

app.use(express.json({ limit: "1mb" }))

app.use((err, _req, res, next) => {
    if (err) {
        if (err.type === "entity.parse.failed") return res.end("Invalid JSON")
        return res.end("Error")
    } else next()
})

app.get("/check", (_req, res) => {
    res.send("API server status: OK")
})

app.post("/Templates/Quote", (req, res) => {
    const data = preprocessRequest(req, res, "96927e83-5b5e-4d06-8c4f-1904628f99ef")
    if (!data) return

    const expectedFields = {
        division: "number",
        orderid: "number",
        name: "string",
        email: "string"
    }

    for (let [field, type] of Object.entries(expectedFields)) {
        if (typeof data[field] != type) return res.end(`Error: Missing or wrong parameter: ${field}`)
    }

    if (!Array.isArray(data.items)) return res.end("Error: Missing or wrong parameter: items")
    if (data.items.length === 0) return res.end("Error: Blank items array")

    const expectedItemFields = {
        product_name: "string",
        certificate_type: "string",
        country: "string",
        item_id: "string",
        price: "string",
        source_language: "string",
        target_language: "string"
    }

    for (let [index, item] of data.items.entries()) {
        for (let [field, type] of Object.entries(expectedItemFields)) {
            if (typeof item[field] != type) return res.end(`Error: Missing or wrong parameter in items[${index}]: ${field}`)
        }
    }

    res.end("OK")
    log("API", "/Templates/Quote " + JSON.stringify(data))
    processor.processAPIRequest("TemplatesQuote", data)
})

app.post("/Templates/FileReady", (req, res) => {
    const data = preprocessRequest(req, res, "549d372b-3839-43cd-ab8f-8bd330ad7e21")
    if (!data) return

    if (typeof data.orderid === "string") data.orderid = parseInt(data.orderid, 10)
    if (typeof data.itemid === "string") data.itemid = parseInt(data.itemid, 10)

    if (!data.orderid) return res.end("Error: Missing or wrong parameter: orderid")
    if (!data.itemid) return res.end("Error: Missing or wrong parameter: itemid")
    if (typeof data.fileurl != "string") return res.end("Error: Missing or wrong parameter: fileurl")

    res.end("OK")

    processor.processAPIRequest("TemplatesFileReady", data)
})

app.post("/Templates/FileApproved", (req, res) => {
    const data = preprocessRequest(req, res, "549d372b-3839-43cd-ab8f-8bd330ad7e21")
    if (!data) return

    if (typeof data.orderid === "string") data.orderid = parseInt(data.orderid, 10)
    if (typeof data.itemid === "string") data.itemid = parseInt(data.itemid, 10)

    if (!data.orderid) return res.end("Error: Missing or wrong parameter: orderid")
    if (!data.itemid) return res.end("Error: Missing or wrong parameter: itemid")

    res.end("OK")

    processor.processAPIRequest("TemplatesFileApproved", data)
})

app.post("/ProjectSupport", (req, res) => {
    const object = preprocessRequest(req, res, "549d372b-3839-43cd-ab8f-8bd330ad7e21")
    if (!object) return

    if (typeof object.PROJECT_NUMBER != "string") return res.end("Error: Missing or wrong parameter: PROJECT_NUMBER")
    if (typeof object.MESSAGE != "string") return res.end("Error: Missing or wrong parameter: MESSAGE")
    if (!["DM", "MT"].includes(object.RECIPIENT)) return res.end("Error: Missing or wrong parameter: RECIPIENT")

    res.end("OK")
    processor.processAPIRequest("ProjectSupport", object)
})

app.post("/SendTwilioMessage", (req, res) => {
    const object = preprocessRequest(req, res, "549d372b-3839-43cd-ab8f-8bd330ad7e21")
    if (!object) return

    if (typeof object.PHONE_NUMBER != "string") return res.end("Error: Missing or wrong parameter: PHONE_NUMBER")
    if (typeof object.MESSAGE != "string") return res.end("Error: Missing or wrong parameter: MESSAGE")

    res.end("OK")
    processor.processAPIRequest("SendTwilioMessage", object)
})

app.post("/UpdateObject", (req, res) => {
    const object = preprocessRequest(req, res, "097bffd3-7862-449f-a8bd-3e4677ccd04f")
    if (!object) return

    if (typeof object.pk != "number") return res.end("Error: pk")
    if (typeof object.table != "string") return res.end("Error: table")
    if (typeof object.field != "string") return res.end("Error: field")
    if (object.value === undefined) return res.end("Error: value")

    res.end("OK")
    processor.processAPIRequest("UpdateObject", object)
})

app.post("/InsertObject", (req, res) => {
    const object = preprocessRequest(req, res, "097bffd3-7862-449f-a8bd-3e4677ccd04f")
    if (!object) return

    res.end("OK")
    processor.processAPIRequest("InsertObject", object)
})

app.post("/AddTranslationReply", (req, res) => {
    const object = preprocessRequest(req, res, "097bffd3-7862-449f-a8bd-3e4677ccd04f")
    if (!object) return

    if (typeof object.employeeID != "number") return res.end("Error: employeeID")
    if (typeof object.subprojectID != "number") return res.end("Error: subprojectID")
    if (typeof object.reply != "number") return res.end("Error: reply")
    if (![1, 2, 3, 4].includes(object.reply)) return res.end("Error: reply")

    res.end("OK")
    processor.processAPIRequest("AddTranslationReply", object)
})

app.post("/CreateSalesAccount", (req, res) => {
    const object = preprocessRequest(req, res, "097bffd3-7862-449f-a8bd-3e4677ccd04f")
    if (!object) return

    res.end("OK")
    processor.processAPIRequest("CreateSalesAccount", object)
})

app.post("/AddEmployeeHoliday", (req, res) => {
    const object = preprocessRequest(req, res, "097bffd3-7862-449f-a8bd-3e4677ccd04f")
    if (!object) return

    res.end("OK")
    processor.processAPIRequest("AddEmployeeHoliday", object)
})

app.post("/CreatePrequote", (req, res) => {
    const object = preprocessRequest(req, res, "097bffd3-7862-449f-a8bd-3e4677ccd04f")
    if (!object) return

    res.end("OK")
    processor.processAPIRequest("CreatePrequote", object)
})

app.post("/AddOCRFile", (req, res) => {
    const object = preprocessRequest(req, res, "097bffd3-7862-449f-a8bd-3e4677ccd04f")
    if (!object) return

    res.end("OK")
    processor.processAPIRequest("AddOCRFile", object)
})

app.post("/ClientCancelQuote", (req, res) => {
    const object = preprocessRequest(req, res, "097bffd3-7862-449f-a8bd-3e4677ccd04f")
    if (!object) return

    res.end("OK")
    processor.processAPIRequest("ClientCancelQuote", object)
})

app.post("/ClientConfirmedNotarizedProjectFile", (req, res) => {
    const object = preprocessRequest(req, res, "097bffd3-7862-449f-a8bd-3e4677ccd04f")
    if (!object) return

    res.end("OK")
    processor.processAPIRequest("ClientConfirmedNotarizedProjectFile", object)
})

app.post("/ClientCommentsForNotarizedProjectFile", (req, res) => {
    const object = preprocessRequest(req, res, "097bffd3-7862-449f-a8bd-3e4677ccd04f")
    if (!object) return

    res.end("OK")
    processor.processAPIRequest("ClientCommentsForNotarizedProjectFile", object)
})

app.post("/AddRating", (req, res) => {
    const object = preprocessRequest(req, res, "097bffd3-7862-449f-a8bd-3e4677ccd04f")
    if (!object) return
    if (typeof object.PROJECT_NUMBER != "string") return res.end("Error: Missing or wrong parameter: PROJECT_NUMBER")
    if (typeof object.SUBPROJECT_ID != "string") return res.end("Error: Missing or wrong parameter: SUBPROJECT_ID")
    if (typeof object.rating != "number" || object.rating <= 0 || object.rating > 10) return res.end("Error: Missing or wrong parameter: rating (Should be in between 1 to 10)")
    if (typeof object.comments != "string") return res.end("Error: Missing or wrong parameter: comments")
    if (object.comments && object.comments.length > 200) return res.end("Error: comments should not be more than 200 words")
    res.end("OK")
    processor.processAPIRequest("AddRating", object)
})

app.post("/AddAIQuote", async (req,res)=>{
    const object = preprocessRequest(req, res, "097bffd3-7862-449f-a8bd-3e4677ccd04f")
    if (!object) return
    if (!object.type) return res.end("Error: Missing or wrong parameter: type")
    if (!object.price) return res.end("Error: Missing or wrong parameter: price")
    if (!object.word_count) return res.end("Error: Missing or wrong parameter: words_count")
    if (!object.SOURCE_LANGUAGE) return res.end("Error: Missing or wrong parameter: SOURCE_LANGUAGE")
    if (!object.emails) return res.end("Error: Missing or wrong parameter: emails")
    if (Array.isArray(object.TARGET_LANGUAGES) && !object.TARGET_LANGUAGES.length) res.end("Error: Missing or wrong parameter: TARGET_LANGUAGES")

    let price = object.price.toString();
    price = price.replace('$', '');
    price = parseInt(price)
    if (!price) {
        return res.end("Error: invalid parameter: price");
    }
    const validSourceLang = await validateLanguages(object.SOURCE_LANGUAGE);
    if (!validSourceLang) {
        return res.end(`Error: invalid SOURCE_LANGUAGE: ${object.SOURCE_LANGUAGE}`);
    }
    object.TARGET_LANGUAGES = object.TARGET_LANGUAGES.filter(lang => lang);
    let invalidTargetLang = '';
    await Promise.all(object.TARGET_LANGUAGES.map(async (tl) => {
        const langId = await validateLanguages(tl)
        console.log('langId', langId)
        if (!langId) invalidTargetLang = tl;
    }));
    if (invalidTargetLang) {
        return res.end(`Error: invalid SOURCE_LANGUAGE: ${invalidTargetLang}`);
    }
    res.end("OK")

    processor.processAPIRequest("AddAIQuote", object)
})

// Preprocess an API request: Check if the input is valid, check if the apikey matches, delete the apikey property, log the request
function preprocessRequest(req, res, requiredAPIKey) {
    const data = req.body
    let error

    if (typeof data != "object") error = "Input error"
    else if (data.apikey != requiredAPIKey) error = "API Key Error"

    if (error) return res.end(error)

    log("API", req.route.path + " " + JSON.stringify(data), true)
    delete data.apikey
    return data
}

app.listen(port, "localhost", () => {
    log("GLOBAL", ` > > > Started Tranwise 3 API Server on port ${port}...`)
}).on("error", error => {
    if (error.code === "EADDRINUSE") log("ERROR", `ERROR! Port ${port} is already in use.`)
    else log("ERROR", error)
})

module.exports = {
    setProcessor
}
