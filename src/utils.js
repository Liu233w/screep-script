module.exports = {
    // from https://github.com/lodash/lodash/issues/1436#issuecomment-365896431
    repeatArray: (arr, times) => _.flatten(_.times(times, _.constant(arr))),
    // TODO: replace other _.reduce to this function
    // TODO: use this callback type in jsdoc otherwhere
    /**
     * @template T
     * @param {T[]} arr
     * @param {function(T):number} valueExtrator
     */
    sumBy: (arr, valueExtrator) => _.reduce(arr, (sum, curr) => sum + valueExtrator(curr), 0),
}