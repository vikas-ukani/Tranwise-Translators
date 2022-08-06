const PDFDocument = require("pdfkit")
const fs = require("fs")
const log = require("./Logger")

function getResourceFile(filePath) {
    if (fs.existsSync(filePath)) return filePath
    else log("ERROR", "Missing invoice resource: " + filePath)
}

const sizeFactor = 3

PDFDocument.prototype.addImage = function (imagePath, x, y, options) {
    if (options) for (let [key, value] of Object.entries(options)) if (["width", "height"].includes(key)) options[key] = value * sizeFactor
    const filePath = getResourceFile(imagePath)
    if (filePath) this.image(filePath, x * sizeFactor, y * sizeFactor, options)
}

PDFDocument.prototype.addLine = function (x1, y1, x2, y2, strokeColor) {
    this.moveTo(x1 * sizeFactor, y1 * sizeFactor)
        .lineTo(x2 * sizeFactor, y2 * sizeFactor)
        .stroke(strokeColor)
}

PDFDocument.prototype.addLink = function (x1, y1, width, height, link) {
    this.link(x1 * sizeFactor, y1 * sizeFactor, width * sizeFactor, height * sizeFactor, link)
}

PDFDocument.prototype.textBold = function (text, x, y, options) {
    this.font(__dirname + "/fonts/OpenSans-Bold.ttf")
        .text(text, x, y, options)
        .font(__dirname + "/fonts/OpenSans.ttf")
}

PDFDocument.prototype.text = function (text, x, y, options) {
    if (options) for (let [key, value] of Object.entries(options)) if (["width"].includes(key)) options[key] = value * sizeFactor
    return this._text(text, x * sizeFactor, y * sizeFactor, options, this._line)
}

PDFDocument.prototype.addPageSizeLetter = function () {
    return this.addPage({ size: [204 * sizeFactor, 264 * sizeFactor] })
}

// This is an async function that ends the document, but waits for the writeStream to finish before returning
PDFDocument.prototype.close = async function () {
    const promise = new Promise(resolve => this.writeStream.on("finish", () => resolve()))
    this._root.data.Names.data = {}
    this.end()
    await promise
    this.writeStream = null
}

function createDocument(path, options) {
    let size = [210 * sizeFactor, 297 * sizeFactor]
    if (options && options.size) size = [options.size[0] * sizeFactor, options.size[1] * sizeFactor]

    const documentOptions = {
        size,
        margin: 0
    }
    const doc = new PDFDocument(documentOptions)
    doc.writeStream = fs.createWriteStream(path)
    doc.pipe(doc.writeStream)
    doc.font(__dirname + "/fonts/OpenSans.ttf")
    doc.lineWidth(0.2 * sizeFactor)
    doc.fontSize(3 * sizeFactor)

    return doc
}

module.exports = {
    createDocument
}
