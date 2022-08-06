const express = require("express")
const app = express()
const config = require("./serverConfig")
const port = 3353

let users = {}

// This script is spawned by the server so it runs separately. It keeps track
// of all the connected users, so the user sessions can be restored when the
// server is restarted, so that users' clients will reconnect automatically.

app.use(express.json({ limit: "20mb" }))

app.get("/users", (_req, res) => {
    res.set("Access-Control-Allow-Origin", "*")
    res.send(JSON.stringify(users))
})

app.get("/check", (_req, res) => {
    res.send("Session server status: OK")
})

app.get("/kill", (_req, res) => {
    res.end("Stopping service...")
    process.exit()
})

app.get("/clean", (_req, res) => {
    users = {}
    res.end("Cleaned session server.")
})

app.post("/user", (req, res) => {
    console.log(req.body)
    let user = req.body
    if (user.token) users[user.token] = user
    res.end()
})

app.post("/removeToken", (req, res) => {
    console.log("Removing token " + req.body.token)
    let token = req.body.token
    delete users[token]
    res.end()
})

app.post("/userData", (req, res) => {
    let userData = req.body
    const user = users[userData.token]
    if (user) {
        for (let key in userData) {
            if (key === "token") continue
            user[key] = userData[key]
        }
    }
    res.end()
})

const listenHost = config.isDeployed ? "localhost" : ""
app.listen(port, listenHost, () => {
    console.log(` > > > Started Tranwise 3 Server-Session on port ${port}...`)
}).on("error", error => {
    if (error.code === "EADDRINUSE") {
        console.log(`ERROR! Port ${port} is already in use.`)
        // The server-session server is already running, so exit.
        process.exit(-1)
    } else {
        console.log(error)
        process.exit(-1)
    }
})
