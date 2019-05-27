const {
    moveToSpawnAndThen,
    FIND_FILTERS,
    renewOrRecycle,
    adjecentSource,
    moveTo,
} = require('./lib')

const STATES = {
    IDLE: 'idle',
    HARVEST: 'harvest', // obsoleted
    CARRY: 'carry',
    BUILD: 'build',
    UPGRADE: 'upgrade',
    TRANSFER: 'transfer',
    RENEW: 'renew',
    REPAIR: 'repair',
}

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
        tryChangeState(creep, STATES.CARRY)
    },
    /**
     * 
     * @param {Creep} creep 
     */
    [STATES.CARRY](creep) {
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
                console.log(`harvest error: ${result}, by ${creep.name}`)
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
        moveToSpawnAndThen(creep, spawn => renewOrRecycle(spawn, creep))
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
            tryChangeState(creep, STATES.HARVEST)
            return
        }
    })()

    if (!creep.memory.state) {
        tryChangeState(creep, STATES.IDLE)
    }

    const state = creep.memory.state

    if (state === STATES.IDLE) {
        tryChangeState(creep, arrangeFunc(creep))
    }

    const actionFunc = ACTIONS[state]
    if (!actionFunc) {
        throw new Error(`illegal state: ${state}, in creep ${creep.name}`)
    }

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
function tryChangeState(creep, newState) {

    const oldState = creep.memory.state
    if (oldState === newState) {
        return
    }

    // console.log(`creep ${creep.name} change state from ${oldState} to ${newState}`)

    // callback functions ...

    // end callback functions

    creep.memory.state = newState
}

module.exports = {
    STATES,
    dispatch,
    ACTIONS,
}