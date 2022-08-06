import store from "../Store/Store"
import cmg from "../ConnectionManager"
import constants from "../Constants"
import utils from "../Utils"

export default {
    created() {
        this.store = store
        this.cmg = cmg
        this.constants = constants
        this.C_ = constants
        this.utils = utils
    }
}
