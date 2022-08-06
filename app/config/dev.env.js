"use strict"
const merge = require("webpack-merge")
const prodEnv = require("./prod.env")

module.exports = merge(prodEnv, {
    NODE_ENV: "'development'",
    SOCKET_ADDRESS: "'localhost:3343'"
})
