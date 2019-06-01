const FIND_FILTERS = {
    transfer: () => ({
        filter: (structure) => {
            return (
                structure.structureType == STRUCTURE_EXTENSION ||
                structure.structureType == STRUCTURE_SPAWN ||
                structure.structureType == STRUCTURE_TOWER
            ) && structure.energy < structure.energyCapacity
        },
    }),
    /**
     * @param {RoomObject} locateable
     * @param {function(Structure):boolean} anding
     */
    repair: (locateable, anding) => ({
        filter: structure => {
            if (_.includes(Memory.notRepairIds, structure.id) ||
                _.find(locateable.room.lookForAt(LOOK_FLAGS, structure.pos), flag => flag.color === COLOR_RED || flag.color === COLOR_GREY)) {
                // don't need to repair
                return false
            }

            if (anding && !anding(structure)) {
                return false
            }

            // don't need to fill rampart
            if (structure.structureType === STRUCTURE_RAMPART) {
                return structure.hits < 50000
            }

            return structure.hits < structure.hitsMax
        },
    }),
    storeToStructure: () => ({
        filter: s => [STRUCTURE_CONTAINER, STRUCTURE_STORAGE].includes(s.structureType) &&
            _.sum(s.store) < s.storeCapacity,
    }),
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
        spawn.recycleCreep(creep)
        return
    }

    return spawn.renewCreep(creep)
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

/**
 * 
 * @param {Creep} creep 
 */
function adjecentSource(creep) {
    const sources = creep.room.find(FIND_SOURCES)
    return _.find(sources, item => creep.pos.isNearTo(item))
}

/**
 * 
 * @param {Creep} creep 
 * @param {function(StructureSpawn)} callBack 
 */
function moveToSpawnAndThen(creep, callBack) {
    const mySpawn = findASpawnOfMine(creep)
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
}

/**
 * find my spawn in room, if not found, find who spawn the creep, or the 'Spawn1'
 * @param {Creep} creep 
 */
function findASpawnOfMine(creep) {
    let mySpawn = creep.room.find(FIND_MY_SPAWNS)[0]
    if (!mySpawn) {
        mySpawn = Game.spawns[creep.memory.spawn || 'Spawn1']
    }
    return mySpawn
}

/**
 * move to the room that creep spawned, then execute the callback
 * @param {Creep} creep 
 * @param {Function} callBack 
 */
function moveToHomeAndThen(creep, callBack) {
    const mySpawn = findASpawnOfMine(creep)
    if (mySpawn) {
        if (creep.room.name !== mySpawn.room.name) {
            moveTo(creep, mySpawn, '#00ff00')
        } else {
            if (callBack) {
                callBack()
            }
        }
    } else {
        console.info('cannot find a spawn, by ', creep.name)
    }
}

/**
 * find the number of creep-reachable area adjcent to the target
 * @param {RoomPosition|RoomObject} pos 
 */
function findAdjcentPassableAreaNumber(pos) {
    let count = 0
    for (let adj of adjcentPositionGenerator(pos)) {
        const items = adj.look()
        if (items.some(item => item.terrain === 'plain' ||
                (item.type === LOOK_STRUCTURES && item.structure.structureType === STRUCTURE_ROAD))) {
            count += 1
        }
    }
    return count
}

/**
 * Giving a position, generate all it's adjcent position, including it self
 * @param {RoomPosition|RoomObject} pos 
 */
function* adjcentPositionGenerator(pos) {
    if (pos instanceof RoomObject) {
        pos = pos.pos
    }

    for (let x = pos.x - 1; x <= pos.x + 1; ++x) {
        for (let y = pos.y - 1; y <= pos.y + 1; ++y) {
            yield new RoomPosition(x, y, pos.roomName)
        }
    }
}

/**
 * 
 * @param {Creep} creep 
 * @param {string} message 
 */
function sayWithSufix(creep, message) {
    creep.say(message + creep.memory.role[0] + creep.name[creep.name.length - 1] + (creep.memory.toDie ? '💀' : ''), true)
}

/**
 * do action first, if return NOT_IN_RANGE try move
 * @param {Creep} creep 
 * @param {RoomObject} target 
 * @param {function(Creep, RoomObject): CreepActionReturnCode} callBack 
 */
function moveToAndThen(creep, target, callBack) {
    const result = callBack(creep, target)
    if (result === ERR_NOT_IN_RANGE) {
        moveTo(creep, target)
    }
    return result
}

/**
 * 
 * @param {Creep} creep 
 * @param {StructureSpawn|string} spawn 
 * @param {string} role 
 */
function checkCreepRole(creep, spawn, role) {
    if (spawn instanceof StructureSpawn) {
        spawn = spawn.name
    }
    return creep.memory.spawn === spawn && creep.memory.role === role
}

module.exports = {
    moveToSpawnAndThen,
    moveTo,
    FIND_FILTERS,
    bodyCost,
    renewOrRecycle,
    spawnSay,
    adjecentSource,
    moveToHomeAndThen,
    findASpawnOfMine,
    findAdjcentPassableAreaNumber,
    adjcentPositionGenerator,
    sayWithSufix,
    moveToAndThen,
    checkCreepRole,
}