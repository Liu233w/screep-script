/* eslint-disable no-unused-vars */
// for quick type command in console

const l = require('./lib')
const s = require('./stateMachine')
const u = require('./utils')

const lib = l
const stateMachine = s
const utils = u

/*
usage:
require('f')('s.STATES.IDLE')
*/

module.exports = function(cmd) {
    return eval(cmd)
}