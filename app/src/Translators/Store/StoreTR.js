import store from "../../Shared/StoreBase"
import { setTWObjectPrototypeFunctions } from "./TWObjectTR"
import storeActions from "./StoreActionsTR"
import utils from "../UtilsTR"

setTWObjectPrototypeFunctions(store)

Object.assign(store.warehouse, {
    tipsTranslators: [],
    tipsFilesTranslators: []
})

Object.assign(store, storeActions)

store.build()

store.setMyself = function(myself) {
    store.myself = myself
}

store.log = function() {
    // Not used in the translators version
}

store.prepare = function() {
    store.subprojects.forEach(subproject => (subproject.projectObject = store.project(subproject.PROJECT_ID)))
    store.translations.forEach(translation => (translation.subprojectObject = store.subproject(translation.SUBPROJECT_ID)))

    store.projects.forEach(project => (project.initial = true))
    store.subprojects.forEach(subproject => (subproject.initial = true))
    store.translations.forEach(translation => (translation.initial = true))

    // eslint-disable-next-line no-undef
    store.newJobSound = new Audio("/static/sounds/SoundAlert.mp3")
}

store.playNewJobSound = function() {
    if (this.skipNewJobSounds) return
    // Don't play the sound more than once in a 2s interval
    this.skipNewJobSounds = true
    setTimeout(() => {
        this.skipNewJobSounds = false
    }, 2000)

    store.newJobSound.play()
}

store.notifyNewProject = function(project, subproject) {
    const language = subproject.targetOrIntermediate()
    let number = project.PROJECT_NUMBER
    if (language) number += ` - ${language}`
    store.addNotification("NewProject", "There's a new job available", number, {
        title: "There's a new job available\n" + number,
        subprojectID: subproject.PK
    })
    store.playNewJobSound()
    utils.showDesktopNotification(`New job: ${number}`, undefined, true)
}

store.loadOlderProjectsStatus = 0

export default store
