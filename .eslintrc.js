module.exports = {
    env: {
        es6: true,
        node: true
    },
    extends: "eslint:recommended",
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: "module"
    },
    rules: {
        indent: ["warn", 4],
        semi: ["warn", "never"],
        quotes: ["error", "double"],
        "no-path-concat": 0,
        "space-before-function-paren": 0,
        "no-unused-vars": 1,
        "no-multiple-empty-lines": 0,
        "key-spacing": 0,
        "eol-last": 0,
        "no-console": "off",
        "no-empty": 0,
        printWidth: 220
    }
}
