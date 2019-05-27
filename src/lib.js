module.exports = {
    /**
     * 
     * @param {Creep} creep 
     * @param {Funtion} callBack 
     */
    moveToSpawnAndThen: function (creep, callBack) {
        let mySpawn = creep.room.find(FIND_MY_SPAWNS)[0]
        if (!mySpawn) {
            mySpawn = Game.spawns[creep.memory.spawn || 'Spawn1']
        }
        if (mySpawn) {
            if (!creep.pos.inRangeTo(mySpawn, SPAWN_RENEW_RATIO)) {
                moveTo(creep, mySpawn, '#00ff00')
            } else {
                if (callBack) {
                    callBack(mySpawn)
                }
            }
        } else {
            console.info('cannot find a spawn, by ', creep.name)
        }
    },
    moveTo,
    FIND_FILTERS: {
        transfer: () => ({
            filter: (structure) => {
                return (
                    structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_TOWER
                ) && structure.energy < structure.energyCapacity
            },
        }),
        repair: locateable => ({
            filter: structure => {
                if (_.includes(Memory.notRepairIds, structure.id) ||
                    _.find(locateable.room.lookForAt(LOOK_FLAGS, structure.pos), flag => flag.color === COLOR_RED)) {
                    // don't need to repair
                    return false
                }

                // don't need to fill rampart
                if (structure.structureType === STRUCTURE_RAMPART) {
                    return structure.hits < 50000
                }

                return structure.hits < structure.hitsMax
            },
        }),
    },
    bodyCost,
    renewOrRecycle,
    spawnSay,
}

function moveTo(creep, target, stroke = '#ffffff') {
    return creep.moveTo(target, {
        visualizePathStyle: {
            stroke,
        },
    })
}

/**
 * If spawn are able to build better creep, recycle previous one; else renew it
 * @param {StructureSpawn} spawn 
 * @param {Creep} creep 
 */
function renewOrRecycle(spawn, creep) {

    if (creep.memory.toDie) {
        creep.say('💀')
        spawn.recycleCreep(creep)
        return
    }

    const totalEnergy = spawn.room.energyAvailable
    if (totalEnergy >= bodyCost(creep.body) * 2) {
        // enough energy to build a *2 one
        creep.say('💀')
        return spawn.recycleCreep(creep)
    } else {
        return spawn.renewCreep(creep)
    }
}

/**
 * total cost to build a creep with the body
 * @param {BodyPartDefinition[]} body 
 */
function bodyCost(body) {
    return _.reduce(body, function (cost, part) {
        return cost + BODYPART_COST[part]
    }, 0)
}

/**
 * 
 * @param {StructureSpawn} spawn 
 * @param {String} message 
 */
function spawnSay(spawn, message) {
    spawn.room.visual.text(
        message,
        spawn.pos.x + 1,
        spawn.pos.y, {
            align: 'left',
            opacity: 0.8,
        })
}