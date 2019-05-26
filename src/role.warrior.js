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
            moveToSpawnAndThen(creep, spawn => spawn.renewCreep(creep))
        }
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
        }
    } else {
        moveToSpawnAndThen(creep)
    }
}

function moveTo(creep, target, stroke = '#ff0000') {
    creep.moveTo(target, {
        visualizePathStyle: {
            stroke,
        }
    })
}

/**
 * 
 * @param {Creep} creep 
 * @param {Funtion} callBack 
 */
function moveToSpawnAndThen(creep, callBack) {
    const mySpawn = creep.room.find(FIND_MY_SPAWNS)[0]
    if (mySpawn) {
        if (!creep.pos.inRangeTo(mySpawn, SPAWN_RENEW_RATIO)) {
            moveTo(creep, mySpawn, "#00ff00")
        } else {
            if (callBack) {
                callBack(mySpawn)
            }
        }
    } else {
        console.info('cannot find a spawn, by ', creep.name)
    }
}

module.exports.run = run