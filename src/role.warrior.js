const {
    moveToSpawnAndThen,
    renewOrRecycle,
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

    if (creep.hits < 100 || creep.memory.healing) {
        creep.say('😱')
        creep.memory.healing = true

        if (creep.hits >= creep.hitsMax) {
            creep.memory.healing = false
        } else {
            moveToSpawnAndThen(creep)
            return
        }
    }

    const enemy = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS)
    if (enemy) {
        if (creep.attack(enemy) === ERR_NOT_IN_RANGE) {
            moveTo(creep, enemy.pos)
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
    // FIXME: if a peaceful room are not visible, this may cause bug
    if (flag && (!flag.room || flag.room.find(FIND_HOSTILE_CREEPS).length > 0)) {
        if (flag.pos.roomName !== creep.pos.roomName) {
            moveTo(creep, flag, '#ff0000')
            return
        }
    }

    moveToSpawnAndThen(creep)
}

function moveTo(creep, target, stroke = '#ff0000') {
    creep.moveTo(target, {
        visualizePathStyle: {
            stroke,
        },
    })
}

module.exports.run = run