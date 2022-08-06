// This script should be run separately from the Tranwise main server.
// It receives logs from the main server and emits them to any connected
// socket.io clients.
// It is used together with LogViewer.html.

const express = require("express")
const app = express()
const http = require("http").createServer(app)
const io = require("socket.io")(http)

app.use(express.json())

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/LogViewer.html")
})

app.post("/", function (req, res) {
    io.emit("LOG", req.body)
    res.send("OK")
})

http.listen(3363, function () {})
