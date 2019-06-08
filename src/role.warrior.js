const {
    moveToSpawnAndThen,
    renewOrRecycle,
    sayWithSufix,
} = require('./lib')

/**
 * 
 * @param {Creep} creep 
 */
function run(creep) {

    const TARGET_FLAG_COLOR = COLOR_RED

    if (creep.ticksToLive <= 100 || creep.memory.renewing || creep.memory.toDie) {
        creep.say('🔁 renew')
        creep.memory.renewing = true

        if (creep.ticksToLive >= 1400) {
            creep.memory.renewing = false
        } else {
            moveToSpawnAndThen(creep, spawn => renewOrRecycle(spawn, creep))
            return
        }
    }

    const enemy = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS)
    if (enemy) {
        sayWithSufix(creep, '⚔')
        if (creep.attack(enemy) === ERR_NOT_IN_RANGE) {
            creep.travelTo(enemy, {
                movingTarget: true,
            })
        }
        if (creep.pos.inRangeTo(enemy, 3)) {
            creep.rangedAttack(enemy)
        }
        return
    }

    // TODO: use this one again

    // let flag = creep.pos.findClosestByPath(FIND_FLAGS, {
    //     filter: flag => flag.color === TARGET_FLAG_COLOR,
    // })
    // if (flag) {

    //     const targets = creep.room.lookForAt(LOOK_STRUCTURES, flag.pos)
    //     if (targets.length === 0) {
    //         flag.remove()
    //     } else {
    //         creep.say('⚔ attack')
    //         if (creep.attack(targets[0]) === ERR_NOT_IN_RANGE) {
    //             moveTo(creep, targets[0])
    //         }
    //         return
    //     }
    // }

    let flag = _.filter(Game.flags, a => a.color === TARGET_FLAG_COLOR)[0]
    if (flag && flag.memory.hasHostile && flag.pos.roomName !== creep.pos.roomName) {
        sayWithSufix(creep, '🚞')
        creep.travelTo(flag)
        return
    }

    moveToSpawnAndThen(creep)
}

module.exports.run = run