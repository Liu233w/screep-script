// eslint-disable-next-line no-unused-vars
const lib = require('./lib')
require('./Traveler')

/**
 * 
 * @param {Creep} creep 
 */
function run(creep) {
    creep.say('user')

    const position = new RoomPosition(47, 32, 'E22N23')
    pickUp(creep, position)
}

/**
 * @param {Creep} creep
 * @param {RoomPosition} pos 
 */
function pickUp(creep, pos) {
    if (creep.pos.isNearTo(pos)) {
        let items = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1)
        if (!items) {
            items = creep.pos.findInRange(FIND_MINERALS, 1)
        }
        console.log(`items: ${JSON.stringify(items)}`)
        if (items) {
            console.log(`pickup res: ${creep.pickup(items[0])}`)
        } else {
            creep.say('done')
        }
    } else {
        creep.travelTo(pos)
    }
}

module.exports.run = run