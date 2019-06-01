module.exports = {
    // from https://github.com/lodash/lodash/issues/1436#issuecomment-365896431
    repeatArray: (arr, times) => _.flatten(_.times(times, _.constant(arr))),
    // TODO: replace other _.reduce to this function
    // TODO: use this callback type in jsdoc otherwhere
    /**
     * @template T
     * @param {T[]} arr
     * @param {function(T):number} valueExtrator
     * @returns {number}
     */
    sumBy: (arr, valueExtrator) => _.reduce(arr, (sum, curr) => sum + valueExtrator(curr), 0),
    /**
     * find the minimum item in the list, get the value by valueExtrator
     * @template T
     * @param {T[]} list
     * @param {function(T):number} valueExtrator
     * @returns {T}
     */
    minBy: (list, valueExtrator) => {
        let minValue = Number.MAX_VALUE
        let minItem = null
        list.forEach(item => {
            let val = valueExtrator(item)
            if (val < minValue) {
                minValue = val
                minItem = item
            }
        })
        return minItem
    },
}