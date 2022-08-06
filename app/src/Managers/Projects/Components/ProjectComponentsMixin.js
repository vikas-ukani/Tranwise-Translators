import store from "../../Store/Store"
import utils from "../../Utils"
import constants from "../../Constants"

export default {
    props: {
        project: Object,
        updateProjectAction: { type: Function, default: undefined }
    },

    created() {
        this.store = store
        this.utils = utils
        this.constants = constants
        this.C_ = constants
    }
}
