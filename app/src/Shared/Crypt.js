import CryptoJS from "crypto-js"

// Obfuscate the encryption / decryption part
const c1 = "data-v-559c33b8"
const c2 = "ui tiny modal persistent"
const a1 = 2
const a2 = 6
let Rabbit = "R"
Rabbit += c1[1]
Rabbit += c1[a1 + a1 + a2 + 3]
Rabbit += c1[a2 + a2 + 1]
Rabbit += c2[1]
Rabbit += c2[3]

let cryptWord = c1[10]
cryptWord += c2[16]
cryptWord += c2[6]
cryptWord += c2[14]
cryptWord += c2[3]

function Crypt(passphrase) {
    let pass = passphrase
    return {
        // The decryption function
        parse: function(data) {
            try {
                // Try to obfuscate the call to the decryption function.
                let func = CryptoJS[Rabbit]
                func = func["de" + cryptWord]
                const dec = func(data, pass)
                return JSON.parse(dec.toString(CryptoJS.enc.Utf8))
            } catch (e) {
                return "Error"
            }
        },
        // The encryption function
        generate: function(data) {
            // return CryptoJS.Rabbit.encrypt(JSON.stringify(data), pass).toString()

            // Obfuscate the call to the encryption function. Equivalent to the line above.
            let func = CryptoJS[Rabbit]
            func = func["en" + cryptWord]
            return func(JSON.stringify(data), pass).toString()
        }
    }
}

export default Crypt
