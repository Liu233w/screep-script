const {
    moveToSpawnAndThen,
    FIND_FILTERS,
    renewOrRecycle,
    adjecentSource,
    moveTo,
} = require('./lib')

const STATES = {
    IDLE: 'idle',
    HARVEST: 'harvest',
    TAKE: 'take',
    BUILD: 'build',
    UPGRADE: 'upgrade',
    TRANSFER: 'transfer',
    RENEW: 'renew',
    REPAIR: 'repair',
}

/*
TODO: add target to memory, will reset when change state. use it as target first
*/

const ACTIONS = {
    /**
     * 
     * @param {Creep} creep 
     */
    [STATES.BUILD](creep) {
        const target = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES)
        if (target) {
            creep.say('🚧')
            if (creep.build(target) == ERR_NOT_IN_RANGE || adjecentSource(creep)) {
                moveTo(creep, target)
            }
        } else {
            tryChangeState(creep, STATES.IDLE)
        }
    },
    /**
     * 
     * @param {Creep} creep 
     */
    [STATES.HARVEST](creep) {

        if (creep.carry.energy < creep.carryCapacity) {

            creep.say('🔄')
            const source = creep.pos.findClosestByPath(FIND_SOURCES)
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                moveTo(creep, source)
            }
        } else {
            tryChangeState(creep, STATES.IDLE)
        }
    },
    /**
     * 
     * @param {Creep} creep 
     */
    [STATES.TAKE](creep) {
        if (creep.carry.energy < creep.carryCapacity) {

            creep.say('💡')

            const sourceList = [
                // ...creep.room.find(FIND_SOURCES),
                ...creep.room.find(FIND_DROPPED_RESOURCES, {
                    filter: s => s.resourceType === RESOURCE_ENERGY,
                }),
                ...creep.room.find(FIND_TOMBSTONES, {
                    filter: s => s.store.energy > 0,
                }),
                ...creep.room.find(FIND_STRUCTURES, {
                    filter: s => [STRUCTURE_CONTAINER, STRUCTURE_STORAGE].includes(s.structureType) &&
                        s.store.energy > 0,
                }),
                ...creep.room.find(FIND_CREEPS, {
                    filter: s => ['longHarvester', 'harvester'].includes(s.memory.role) &&
                        s.carry.energy > 0 && !s.memory.harvest,
                }),
            ]

            let best = creep.pos.findClosestByPath(sourceList)
            if (!best) {
                // console.log('cannot find a path to the source, it may due to a jam, in worker.harvest, by ' + creep.name)
                best = creep.pos.findClosestByRange(sourceList)
            }

            if (!best) {
                // TODO: try to harvest
                creep.say('⚠ no enough source to collect')
                creep.moveTo(creep.room.find(FIND_MY_SPAWNS)[0])
                return
            }

            let result
            if (best instanceof Source) {
                result = creep.harvest(best)
            } else if (best instanceof Resource) {
                result = creep.pickup(best)
            } else if (best instanceof Tombstone || best instanceof Structure) {
                result = creep.withdraw(best, RESOURCE_ENERGY)
            } else if (best instanceof Creep) {
                if (creep.pos.isNearTo(best)) {
                    best.cancelOrder()
                    result = best.transfer(creep, RESOURCE_ENERGY)
                } else {
                    result = ERR_NOT_IN_RANGE
                }
            } else {
                console.log(`unknown type: ${typeof best}`)
            }

            if (result == ERR_NOT_IN_RANGE) {
                moveTo(creep, best, '#ffaa00')
            } else if (result !== OK) {
                console.log(`take error: ${result}, by ${creep.name}`)
            }
        } else {
            tryChangeState(creep, STATES.IDLE)
        }
    },
    /**
     * 
     * @param {Creep} creep 
     */
    [STATES.TRANSFER](creep) {
        const target = creep.pos.findClosestByRange(FIND_STRUCTURES, FIND_FILTERS.transfer(creep))
        if (target) {
            creep.say('⚡')
            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE || adjecentSource(creep)) {
                moveTo(creep, target)
            }
        } else {
            tryChangeState(creep, STATES.IDLE)
        }
    },
    /**
     * 
     * @param {Creep} creep 
     */
    [STATES.UPGRADE](creep) {
        creep.say('✨')
        if (Memory.messageToSign && Memory.messageToSign[creep.room.controller.id]) {
            const result = creep.signController(creep.room.controller, Memory.messageToSign[creep.room.controller.id])
            if (result === ERR_NOT_IN_RANGE) {
                moveTo(creep, creep.room.controller)
            } else if (result === OK) {
                delete Memory.messageToSign[creep.room.controller.id]
            }
        }
        if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
            moveTo(creep, creep.room.controller)
        }
    },
    /**
     * 
     * @param {Creep} creep 
     */
    [STATES.RENEW](creep) {
        if (creep.ticksToLive >= 1400) {
            tryChangeState(creep, STATES.IDLE)
            return
        }

        creep.say('🔁')
        moveToSpawnAndThen(creep, spawn => {
            const result = renewOrRecycle(spawn, creep)
            if (result === ERR_NOT_ENOUGH_ENERGY) {
                if (creep.carry.energy > 0) {
                    creep.transfer(spawn, RESOURCE_ENERGY)
                } else {
                    tryChangeState(creep, STATES.IDLE)
                }
            }
        })
    },
    /**
     * 
     * @param {Creep} creep 
     */
    [STATES.REPAIR](creep) {
        const target = creep.pos.findClosestByRange(FIND_STRUCTURES, FIND_FILTERS.repair(creep))
        if (target) {
            creep.say('🔨')
            if (creep.repair(target) == ERR_NOT_IN_RANGE || adjecentSource(creep)) {
                moveTo(creep, target)
            }
        } else {
            tryChangeState(creep, STATES.IDLE)
        }
    },
}

/**
 * 
 * @param {Creep} creep 
 * @param {Function<Creep, string>} arrangeFunc 
 */
function dispatch(creep, arrangeFunc) {

    (function () {
        if (creep.ticksToLive <= 100 && creep.body.length > 3) {
            tryChangeState(creep, STATES.RENEW)
            return
        }
        if (creep.carry.energy === 0) {
            tryChangeState(creep, STATES.TAKE)
            return
        }
    })()

    if (!creep.memory.state) {
        tryChangeState(creep, STATES.IDLE)
    }

    if (creep.memory.state === STATES.IDLE) {
        tryChangeState(creep, arrangeFunc(creep))
    }

    const actionFunc = ACTIONS[creep.memory.state]
    if (!actionFunc) {
        console.log(`illegal state: ${creep.memory.state}, in creep ${creep.name}, change to IDLE`)
        tryChangeState(creep, STATES.IDLE)
        return
    }

    // console.log(`executing action ${creep.memory.state}, by ${creep.name}`)
    actionFunc(creep)

    if (creep.memory.state === STATES.IDLE) {
        // re-dispatch
        dispatch(creep, arrangeFunc)
    }
}

/**
 *  
 * @param {Creep} creep 
 * @param {string} newState 
 */
function tryChangeState(creep, newState, target = null) {

    const oldState = creep.memory.state
    if (oldState === newState) {
        return
    }

    // console.log(`creep ${creep.name} change state from ${oldState} to ${newState}`)

    // callback functions ...
    // TODO: optimise
    updateStateCount(creep.room.name, creep.memory.role, oldState, -1)
    updateStateCount(creep.room.name, creep.memory.role, newState, +1)

    creep.memory.target = target

    // end callback functions

    creep.memory.state = newState
}

function global() {
    const creepStates = _.countBy(Game.creeps, c => `${c.room.name}.${c.memory.role}.${c.memory.state}`)
    const creepRoles = _.countBy(Game.creeps, c => `${c.room.name}.${c.memory.role}`)
    Memory.creepStates = creepStates
    Memory.creepRoles = creepRoles
}

function getStateCount(roomName, role, state) {
    const key = `${roomName}.${role}.${state}`
    // console.log('key', key)
    return Memory.creepStates[key] || 0
}

function updateStateCount(roomName, role, state, change) {
    const key = `${roomName}.${role}.${state}`
    const orig = Memory.creepStates[key] || 0
    Memory.creepStates[key] = orig + change
}

function getRoleCount(roomName, role) {
    return Memory.creepRoles[`${roomName}.${role}`]
}

module.exports = {
    STATES,
    dispatch,
    ACTIONS,
    global,
    getStateCount,
    getRoleCount,
}