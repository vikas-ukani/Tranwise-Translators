// This is the JavaScript code for register.html
// It's stored in a separate file, so we can minify it.
// If you change something here, minify the file and copy
// the contents of register.min.js inside the <script>
// tags in register.min.html before deploying.

var app = new Vue({
    el: "#app",

    data: {
        username: "",
        password: "",
        passwordCheck: "",
        firstName: "",
        lastName: "",
        email: "",
        translationAreas: {},
        otherTranslationAreas: "",
        nativeLanguage1: 0,
        nativeLanguage2: 0,
        sourceLanguage: 0,
        targetLanguage: 0,
        highlightMandatoryFields: false,
        resumeUploadStatus: "Upload a file of maximum 5 MB",
        resumeFileID: "",
        resumeFileName: "",
        languagePairs: [],
        isPhoneInterpreter: false,
        isVideoInterpreter: false,
        errors: [],
        responseError: "",
        didSucceed: false,
        isRegisterButtonDisabled: false,
        languages: "LANGUAGES_DATA"
    },

    mounted() {
        $(".ui.dropdown").dropdown()
        $(".ui.checkbox").checkbox()
    },

    computed: {
        isEmailValid() {
            return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(this.email)
        },

        isAddLanguagePairButtonEnabled() {
            if (!this.sourceLanguage || !this.targetLanguage) return false
            if (this.sourceLanguage === this.targetLanguage) return false
            for (let pair of this.languagePairs) if (pair.sourceLanguage.PK === this.sourceLanguage && pair.targetLanguage.PK === this.targetLanguage) return false
            return true
        }
    },

    methods: {
        selectTranslationArea(area) {
            if (!this.translationAreas[area]) this.translationAreas[area] = true
            else this.translationAreas[area] = false
        },

        selectPhoneInterpreting() {
            this.isPhoneInterpreter = !this.isPhoneInterpreter
        },

        selectVideoInterpreting() {
            this.isVideoInterpreter = !this.isVideoInterpreter
        },

        addLanguagePair() {
            let sourceLanguage, targetLanguage
            for (let language of this.languages) {
                if (language.PK === this.sourceLanguage) sourceLanguage = language
                if (language.PK === this.targetLanguage) targetLanguage = language
            }

            if (!sourceLanguage || !targetLanguage) return
            if (sourceLanguage === targetLanguage) return

            this.sourceLanguage = 0
            this.targetLanguage = 0
            $("#dropdown-source-language").dropdown("clear")
            $("#dropdown-target-language").dropdown("clear")

            for (let pair of this.languagePairs) if (pair.sourceLanguage.PK === sourceLanguage.PK && pair.targetLanguage.PK === targetLanguage.PK) return

            this.languagePairs.push({ sourceLanguage, targetLanguage, id: sourceLanguage.PK * 1000 + targetLanguage.PK })
        },

        removeLanguagePair(source, target) {
            for (let i = 0; i < this.languagePairs.length; i++) {
                const pair = this.languagePairs[i]
                if (pair.id === source * 1000 + target) {
                    this.languagePairs.splice(i, 1)
                    break
                }
            }
        },

        selectResumeFile() {
            $("#resume-input").click()
        },

        uploadResume(event) {
            const files = [...event.srcElement.files]
            const file = files[0]
            if (!file) return

            this.resumeFileID = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10)
            this.resumeFileName = file.name

            const fileInfo = {
                id: this.resumeFileID,
                fileName: file.name
            }

            const formData = new FormData()
            formData.append("FileInfo", JSON.stringify(fileInfo))
            formData.append("File", file)
            const xhr = new XMLHttpRequest()
            xhr.upload.addEventListener(
                "progress",
                evt => {
                    if (!evt.lengthComputable) return
                    const percentComplete = Math.round((evt.loaded / evt.total) * 100)
                    if (percentComplete >= 100) this.resumeUploadStatus = "Upload complete"
                    else this.resumeUploadStatus = `Uploading... ${percentComplete}% done`
                },
                false
            )
            xhr.open("POST", "https://translators.tranwise.com/Register/Resume", true)
            xhr.send(formData)

            $("#resume-input").val("")
        },

        register() {
            // Some users only select the languages but don't click the Add button, so do it for them
            this.addLanguagePair()

            this.errors.splice(0)
            if ([this.username, this.password, this.passwordCheck, this.firstName, this.lastName, this.email].includes("")) this.errors.push("Fill in all the mandatory fields")

            if (this.username.length > 50) this.errors.push("Choose a username of maximum 50 characters")

            if (this.password.length > 50) this.errors.push("Choose a password of maximum 50 characters")

            if (!/^[0-9a-zA-Z._@-]{0,50}$/.test(this.username)) this.errors.push("The username should contain only letters, numbers and the following characters: _ . @ -")

            if (this.email && !this.isEmailValid) this.errors.push("Type a valid email address")

            if (!this.nativeLanguage1) this.errors.push("Select your native language")

            if (!this.languagePairs.length) this.errors.push("Add at least one language pair")

            if (this.password && this.passwordCheck && this.password != this.passwordCheck) this.errors.push("The two passwords do not match")

            if (this.password === this.passwordCheck && this.password.length < 8) this.errors.push("Choose a password of at least 8 characters")

            if (this.errors.length) {
                this.highlightMandatoryFields = true
                return
            }

            this.isRegisterButtonDisabled = true
            this.responseError = ""

            const data = {
                username: this.username,
                password: this.password,
                firstName: this.firstName,
                lastName: this.lastName,
                email: this.email,
                nativeLanguage1: parseInt(this.nativeLanguage1, 10),
                nativeLanguage2: parseInt(this.nativeLanguage2, 10),
                isPhoneInterpreter: this.isPhoneInterpreter ? 1 : 0,
                isVideoInterpreter: this.isVideoInterpreter ? 1 : 0,
                otherTranslationAreas: this.otherTranslationAreas,
                translationAreas: [],
                languagePairs: [],
                resumeFileName: this.resumeFileName,
                resumeFileID: this.resumeFileID
            }

            for (let [key, value] of Object.entries(this.translationAreas)) {
                if (value) data.translationAreas.push(parseInt(key, 10))
            }

            for (let pair of this.languagePairs) {
                data.languagePairs.push({ from: parseInt(pair.sourceLanguage.PK, 10), to: parseInt(pair.targetLanguage.PK, 10) })
            }

            axios({
                method: "post",
                url: "https://translators.tranwise.com/Register/",
                data
            })
                .then(response => {
                    if (response.data != "SUCCESS") {
                        this.responseError = response.data
                        this.isRegisterButtonDisabled = false
                    } else this.didSucceed = true
                })
                .catch(error => {
                    this.responseError = "There was an error submitting the form. Please try again."
                    this.isRegisterButtonDisabled = false
                })
        },

        chat() {
            window.open("https://www.universal-translation-services.com/support/")
        }
    }
})
