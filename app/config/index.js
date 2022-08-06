"use strict"
// Template version: 1.3.1
// see http://vuejs-templates.github.io/webpack for documentation.

const path = require("path")

let assetsSubDirectory = "static"
if (process.env.TRANWISE_TARGET === "Managers") assetsSubDirectory = "static-a602d66123a4c4556b1fc42c4e73acf9"
if (process.env.TRANWISE_TARGET === "Translators") assetsSubDirectory = "static-bf564b3bd0c34ba3b2e29e22a3518b09"
if (process.env.TRANWISE_TARGET === "Clients") assetsSubDirectory = "static-c14742d4ac994c6e8c2a48c9192e38fb"

module.exports = {
    dev: {
        // Paths
        assetsSubDirectory: "static",
        assetsPublicPath: "/",
        proxyTable: {},

        // Various Dev Server settings
        host: "localhost", // can be overwritten by process.env.HOST
        port: 8080, // can be overwritten by process.env.PORT, if port is in use, a free one will be determined
        autoOpenBrowser: false,
        errorOverlay: true,
        notifyOnErrors: true,
        poll: false, // https://webpack.js.org/configuration/dev-server/#devserver-watchoptions-

        /**
         * Source Maps
         */

        // https://webpack.js.org/configuration/devtool/#development
        // devtool: "cheap-module-eval-source-map",
        devtool: "source-map",

        // If you have problems debugging vue-files in devtools,
        // set this to false - it *may* help
        // https://vue-loader.vuejs.org/en/options.html#cachebusting
        cacheBusting: true,

        cssSourceMap: true
    },

    build: {
        // Template for index.html
        index: path.resolve(__dirname, "../dist/" + process.env.TRANWISE_TARGET + "/index.html"),

        // Paths
        assetsRoot: path.resolve(__dirname, "../dist/" + process.env.TRANWISE_TARGET),
        assetsSubDirectory: assetsSubDirectory,
        // assetsPublicPath: "/Tranwise3/preview",

        /**
         * Source Maps
         */

        productionSourceMap: false,
        // https://webpack.js.org/configuration/devtool/#production
        devtool: "#source-map",

        // Gzip off by default as many popular static hosts such as
        // Surge or Netlify already gzip all static assets for you.
        // Before setting to `true`, make sure to:
        // npm install --save-dev compression-webpack-plugin
        productionGzip: false,
        productionGzipExtensions: ["js", "css"],

        // Run the build command with an extra argument to
        // View the bundle analyzer report after build finishes:
        // `npm run build --report`
        // Set to `true` or `false` to always turn it on or off
        bundleAnalyzerReport: process.env.npm_config_report
    }
}
