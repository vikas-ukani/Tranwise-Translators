const CryptoJS = require("crypto-js")

function Crypt(passphrase) {
    var pass = passphrase

    return {
        decrypt: function(data) {
            try {
                const dec = CryptoJS.Rabbit.decrypt(data, pass)
                return JSON.parse(dec.toString(CryptoJS.enc.Utf8))
            } catch (e) {
                return "DECRYPTION_ERROR"
            }
        },
        encrypt: function(string) {
            return CryptoJS.Rabbit.encrypt(string, pass).toString()
        }
    }
}

module.exports = Crypt
