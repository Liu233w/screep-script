const {
    moveTo,
    moveToAndThen,
} = require('./lib')

const TARGET_FLAG_COLOR = COLOR_PURPLE

/**
 * @param {Creep} creep
 */
function run(creep) {
    const flag = _.filter(Game.flags, a => a.color === TARGET_FLAG_COLOR)[0]
    if (flag) {
        if (flag.pos.roomName !== creep.pos.roomName) {
            moveTo(creep, flag, '#ffaa00')
        } else {

            const controller = creep.room.controller

            if (Memory.messageToSign && Memory.messageToSign[controller.id]) {
                const result = creep.signController(controller, Memory.messageToSign[creep.room.controller.id])
                if (result === ERR_NOT_IN_RANGE) {
                    moveTo(creep, controller)
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