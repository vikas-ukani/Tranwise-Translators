/* eslint-disable */

function doit(eml, successCallback, failureCallback) {
    read(eml, (error, data) => {
        if (error) failureCallback(error)
        else successCallback(data)
    })
}

// https://github.com/papnkukn/eml-format/blob/master/lib/eml-format.js

var emlformat = {
    verbose: false,
    fileExtensions: {
        "text/plain": ".txt",
        "text/html": ".html",
        "image/png": ".png",
        "image/jpg": ".jpg",
        "image/jpeg": ".jpg"
    },
    //Gets file extension by mime type
    getFileExtension: function(mimeType) {
        return emlformat.fileExtensions[mimeType] || ""
    },
    //Gets the boundary name
    getBoundary: function(contentType) {
        var match = /boundary="?(.+?)"?(\s*;[\s\S]*)?$/g.exec(contentType)
        return match ? match[1] : undefined
    },
    //Gets name and e-mail address from a string, e.g. "My Name" <noreply@mydomain.com> => { name: "My Name", email: "noreply@mydomain.com" }
    getEmailAddress: function(raw) {
        var result = {}
        var regex = /^(.*?)(\s*\<(.*?)\>)$/g
        var match = regex.exec(raw)
        if (match) {
            var name = emlformat
                .unquoteUTF8(match[1])
                .replace(/"/g, "")
                .trim()
            if (name && name.length) {
                result.name = name
            }
            result.email = match[3].trim()
        } else {
            result.email = raw
        }
        return result
    },
    //Builds e-mail address string, e.g. { name: "PayPal", email: "noreply@paypal.com" } => "PayPal" <noreply@paypal.com>
    toEmailAddress: function(data) {
        var email = ""
        if (typeof data == "undefined") {
            //No e-mail address
        } else if (typeof data == "string") {
            email = data
        } else {
            if (data.name) {
                email += '"' + data.name + '"'
            }
            if (data.email) {
                email += (email.length ? " " : "") + "<" + data.email + ">"
            }
        }
        return email
    },
    //Decodes string like =?UTF-8?B?V2hhdOKAmXMgeW91ciBvbmxpbmUgc2hvcHBpbmcgc3R5bGU/?= or =?UTF-8?Q?...?=
    unquoteUTF8: function(s) {
        var regex = /=\?UTF\-8\?(B|Q)\?(.+?)(\?=)/gi
        var match = regex.exec(s)
        if (match) {
            var type = match[1].toUpperCase()
            var value = match[2]
            if (type == "B") {
                //Base64
                return Buffer.from(value.replace(/\r?\n/g, ""), "base64").toString("utf8")
            } else if (type == "Q") {
                //Quoted printable
                return emlformat.unquotePrintable(value)
            }
        }
        return s
    },
    //Decodes "quoted-printable"
    unquotePrintable: function(s) {
        //Convert =0D to '\r', =20 to ' ', etc.
        return s
            .replace(/=3D/gi, "<EQUAL_SIGN>")
            .replace(/=([\w\d]{2})=([\w\d]{2})=([\w\d]{2})/gi, function(matcher, p1, p2, p3, offset, string) {
                return new Buffer([parseInt(p1, 16), parseInt(p2, 16), parseInt(p3, 16)]).toString("utf8")
            })
            .replace(/=([\w\d]{2})=([\w\d]{2})/gi, function(matcher, p1, p2, offset, string) {
                return new Buffer([parseInt(p1, 16), parseInt(p2, 16)]).toString("utf8")
            })
            .replace(/=([\w\d]{2})/gi, function(matcher, p1, offset, string) {
                return String.fromCharCode(parseInt(p1, 16))
            })
            .replace(/=\r?\n/gi, "") //Join line
            .replace(/<EQUAL_SIGN>/g, "=")
    }
}

function parseRecursive(lines, start, parent, options) {
    var boundary = null
    var lastHeaderName = ""
    var findBoundary = ""
    var insideBody = false
    var insideBoundary = false
    var isMultiHeader = false
    var isMultipart = false

    parent.headers = {}
    //parent.body = null;

    function complete(boundary) {
        //boundary.part = boundary.lines.join("\r\n");
        boundary.part = {}
        parseRecursive(boundary.lines, 0, boundary.part, options)
        delete boundary.lines
    }

    //Read line by line
    for (var i = start; i < lines.length; i++) {
        var line = lines[i]

        //Header
        if (!insideBody) {
            //Search for empty line
            if (line == "") {
                insideBody = true

                if (options && options.headersOnly) {
                    break
                }

                //Expected boundary
                var ct = parent.headers["Content-Type"]
                if (ct && /^multipart\//g.test(ct)) {
                    var b = emlformat.getBoundary(ct)
                    if (b && b.length) {
                        findBoundary = b
                        isMultipart = true
                        parent.body = []
                    } else {
                        if (emlformat.verbose) {
                            console.warn("Multipart without boundary! " + ct.replace(/\r?\n/g, " "))
                        }
                    }
                }

                continue
            }

            //Header value with new line
            var match = /^\s+([^\r\n]+)/g.exec(line)
            if (match) {
                if (isMultiHeader) {
                    parent.headers[lastHeaderName][parent.headers[lastHeaderName].length - 1] += "\r\n" + match[1]
                } else {
                    parent.headers[lastHeaderName] += "\r\n" + match[1]
                }
                continue
            }

            //Header name and value
            match = /^([\w\d\-]+):\s+([^\r\n]+)/gi.exec(line)
            if (match) {
                lastHeaderName = match[1]
                if (parent.headers[lastHeaderName]) {
                    //Multiple headers with the same name
                    isMultiHeader = true
                    if (typeof parent.headers[lastHeaderName] == "string") {
                        parent.headers[lastHeaderName] = [parent.headers[lastHeaderName]]
                    }
                    parent.headers[lastHeaderName].push(match[2])
                } else {
                    //Header first appeared here
                    isMultiHeader = false
                    parent.headers[lastHeaderName] = match[2]
                }
                continue
            }
        }
        //Body
        else {
            //Multipart body
            if (isMultipart) {
                //Search for boundary start
                if (line.indexOf("--" + findBoundary) == 0 && !/\-\-(\r?\n)?$/g.test(line)) {
                    insideBoundary = true

                    //Complete the previous boundary
                    if (boundary && boundary.lines) {
                        complete(boundary)
                    }

                    //Start a new boundary
                    let match = /^\-\-([^\r\n]+)(\r?\n)?$/g.exec(line)
                    boundary = { boundary: match[1], lines: [] }
                    parent.body.push(boundary)

                    if (emlformat.verbose) {
                        console.log("Found boundary: " + boundary.boundary)
                    }

                    continue
                }

                if (insideBoundary) {
                    //Search for boundary end
                    if (boundary.boundary && lines[i - 1] == "" && line.indexOf("--" + findBoundary + "--") == 0) {
                        insideBoundary = false
                        complete(boundary)
                        continue
                    }
                    boundary.lines.push(line)
                }
            } else {
                //Solid string body
                parent.body = lines.splice(i).join("\r\n")
                break
            }
        }
    }

    //Complete the last boundary
    if (parent.body && parent.body.length && parent.body[parent.body.length - 1].lines) {
        complete(parent.body[parent.body.length - 1])
    }
}

function searchForTextBody(content) {
    if (typeof content.body === "string" && content.headers && content.headers["Content-Type"] && content.headers["Content-Type"].includes("text/plain")) {
        var encoding = content.headers["Content-Transfer-Encoding"]
        if (encoding == "base64") return Buffer.from(content.body.replace(/\r?\n/g, ""), "base64").toString("utf-8")
        return emlformat.unquotePrintable(content.body)
    }
    if (Array.isArray(content.body)) {
        for (let part of content.body) return searchForTextBody(part.part)
    }
}

function parse(eml, options, callback) {
    //Shift arguments
    if (typeof options == "function" && typeof callback == "undefined") {
        callback = options
        options = null
    }

    if (typeof callback != "function") {
        callback = function(error, result) {}
    }

    try {
        if (typeof eml != "string") {
            throw new Error("Argument 'eml' expected to be string!")
        }

        var lines = eml.replace(/\r?\n\t/g, "").split(/\r?\n/)
        var result = {}
        parseRecursive(lines, 0, result, options)

        // Search for text body, as the parsing doesn't generate that for certain emails
        try {
            result.textBody = searchForTextBody(result)
        } catch (error) {}

        callback(null, result)
    } catch (e) {
        callback(e)
    }
}

function read(eml, options, callback) {
    //Shift arguments
    if (typeof options == "function" && typeof callback == "undefined") {
        callback = options
        options = null
    }

    if (typeof callback != "function") {
        callback = function(error, result) {}
    }

    function _read(data) {
        try {
            var result = {}
            if (data.headers["Date"]) {
                result.date = new Date(data.headers["Date"])
            }
            if (data.headers["Subject"]) {
                result.subject = emlformat.unquoteUTF8(data.headers["Subject"])
            }
            if (data.headers["From"]) {
                result.from = emlformat.getEmailAddress(data.headers["From"])
            }
            if (data.headers["To"]) {
                result.to = emlformat.getEmailAddress(data.headers["To"])
            }
            result.headers = data.headers

            //Appends the boundary to the result
            function _append(headers, content) {
                var encoding = headers["Content-Transfer-Encoding"]
                if (encoding == "base64") {
                    content = Buffer.from(content.replace(/\r?\n/g, ""), "base64")
                } else if (encoding == "quoted-printable") {
                    content = emlformat.unquotePrintable(content)
                }

                var contentType = headers["Content-Type"]
                if (!result.html && contentType && contentType.indexOf("text/html") >= 0) {
                    if (typeof content != "string") {
                        content = content.toString("utf8")
                    }
                    //Message in HTML format
                    result.html = content
                } else if (!result.text && contentType && contentType.indexOf("text/plain") >= 0) {
                    if (typeof content != "string") {
                        content = content.toString("utf8")
                    }
                    //Plain text message
                    result.text = content
                } else {
                    //Get the attachment
                    if (!result.attachments) {
                        result.attachments = []
                    }

                    var attachment = {}

                    var id = headers["Content-ID"]
                    if (id) {
                        attachment.id = id
                    }

                    var name = headers["Content-Disposition"] || headers["Content-Type"]
                    name = name.replace(/\r/g, "").replace(/\n/g, "")

                    if (name) {
                        var match = /name="(.+?)"/gi.exec(name)
                        if (!match) match = /name=(.+?);/gi.exec(name)
                        if (!match) match = /name=(.+?)$/gi.exec(name)
                        if (match) {
                            name = match[1]
                        } else {
                            name = null
                        }
                    }
                    if (name) {
                        attachment.name = name
                    }

                    var ct = headers["Content-Type"]
                    if (ct) {
                        attachment.contentType = ct
                    }

                    var cd = headers["Content-Disposition"]
                    if (cd) {
                        attachment.inline = /^\s*inline/g.test(cd)
                    }

                    attachment.data = content
                    result.attachments.push(attachment)
                }
            }

            //Content mime type
            var boundary = null
            var ct = data.headers["Content-Type"]
            if (ct && /^multipart\//g.test(ct)) {
                var b = emlformat.getBoundary(ct)
                if (b && b.length) {
                    boundary = b
                }
            }

            if (boundary) {
                for (var i = 0; i < data.body.length; i++) {
                    var b = data.body[i]

                    //Get the message content
                    if (typeof b.part == "undefined") {
                        conole.warn("Warning: undefined b.part")
                    } else if (typeof b.part == "string") {
                        result.data = b.part
                    } else {
                        if (typeof b.part.body == "undefined") {
                            conole.warn("Warning: undefined b.part.body")
                        } else if (typeof b.part.body == "string") {
                            b.part.body

                            var headers = b.part.headers
                            var content = b.part.body

                            _append(headers, content)
                        } else {
                            for (var j = 0; j < b.part.body.length; j++) {
                                if (typeof b.part.body[j] == "string") {
                                    result.data = b.part.body[j]
                                    continue
                                }

                                var headers = b.part.body[j].part.headers
                                var content = b.part.body[j].part.body

                                _append(headers, content)
                            }
                        }
                    }
                }
            } else if (typeof data.body == "string") {
                _append(data.headers, data.body)
            }

            if (!result.text) result.text = data.textBody

            callback(null, result)
        } catch (e) {
            callback(e)
        }
    }

    if (typeof eml == "string") {
        parse(eml, options, function(error, data) {
            if (error) return callback(error)
            _read(data)
        })
    } else if (typeof eml == "object") {
        _read(eml)
    } else {
        callback(new Error("Missing EML file content!"))
    }
}

export default doit
