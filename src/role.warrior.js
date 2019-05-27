const {
    moveToSpawnAndThen,
    renewOrRecycle,
} = require('./lib')

/**
 * 
 * @param {Creep} creep 
 */
function run(creep) {

    if (creep.ticksToLive <= 100 || creep.memory.renewing) {
        creep.say('🔁 renew')
        creep.memory.renewing = true

        if (creep.ticksToLive >= 1400) {
            creep.memory.renewing = false
        } else {
            moveToSpawnAndThen(creep, spawn => renewOrRecycle(spawn, creep))
            return
        }
    }

    const enemy = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
    if (enemy) {
        if (creep.attack(enemy) === ERR_NOT_IN_RANGE) {
            creep.moveTo(enemy.pos)
        }
        return
    }

    const flag = creep.pos.findClosestByPath(FIND_FLAGS, {
        filter: flag => flag.color === COLOR_RED
    })
    if (flag) {

        const targets = creep.room.lookForAt(LOOK_STRUCTURES, flag.pos)
        if (targets.length === 0) {
            flag.remove()
        } else {
            creep.say('⚔ attack')
            if (creep.attack(targets[0]) === ERR_NOT_IN_RANGE) {
                moveTo(creep, targets[0])
            }
            return
        }
    }

    moveToSpawnAndThen(creep)
}

function moveTo(creep, target, stroke = '#ff0000') {
    creep.moveTo(target, {
        visualizePathStyle: {
            stroke,
        }
    })
}

module.exports.run = run