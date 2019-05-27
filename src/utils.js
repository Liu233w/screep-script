module.exports = {
    // from https://github.com/lodash/lodash/issues/1436#issuecomment-365896431
    repeatArray: (arr, times) => _.flatten(_.times(times, _.constant(arr))),
}