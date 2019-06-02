const {
    moveToAndThen,
} = require('./lib')

const TARGET_FLAG_COLOR = COLOR_PURPLE

/**
 * @param {Creep} creep
 */
function run(creep) {
    const flag = _.filter(Game.flags, a => a.color === TARGET_FLAG_COLOR)[0]
    if (flag) {
        // to make sure room is visable
        if (flag.pos.roomName !== creep.pos.roomName) {
            creep.travelTo(flag)
        } else {

            const controller = flag.room.controller

            if (Memory.messageToSign && Memory.messageToSign[controller.id]) {
                const result = creep.signController(controller, Memory.messageToSign[creep.room.controller.id])
                if (result === ERR_NOT_IN_RANGE) {
                    creep.travelTo(controller)
                    return
                } else if (result === OK) {
                    delete Memory.messageToSign[creep.room.controller.id]
                }
            }

            moveToAndThen(creep, controller, () => creep.reserveController(controller))
        }
    }
}

module.exports.run = run