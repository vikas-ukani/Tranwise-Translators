const benchmark = {
    // Used to count how many times functions are called, so we can track CPU intensive functions
    functionCallCount: {},

    trackFunctionCall(functionName) {
        if (!this.functionCallCount[functionName]) this.functionCallCount[functionName] = 1
        else this.functionCallCount[functionName]++
    }
}

export default benchmark
