let state = {}

function getState(pageName) {
    return state[pageName]
}

function setState(pageName, pageState) {
    state[pageName] = pageState
}

export default { getState, setState }
