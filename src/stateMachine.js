const {
    moveToSpawnAndThen,
    FIND_FILTERS,
    renewOrRecycle,
    adjecentSource,
    moveTo,
    moveToHomeAndThen,
    sayWithSufix,
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
    STORE: 'store',
    GO_HOME: 'go_home',
    LONG_HARVEST: 'long_harvest',
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
            sayWithSufix(creep, '🚧')
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

            sayWithSufix(creep, '🔄')
            const source = creep.pos.findClosestByPath(FIND_SOURCES, {
                filter: s => s.energy > 0,
            })

            if (!source) {
                if (creep.carry.energy > 0) {
                    tryChangeState(creep, STATES.IDLE)
                } else {
                    // TODO: move off the road ?
                    sayWithSufix(creep, '🔄⚠')
                }
            }

            const result = creep.harvest(source)
            if (result == ERR_NOT_IN_RANGE) {
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

            sayWithSufix(creep, '🔌')

            const sourceList = [
                // ...creep.room.find(FIND_SOURCES),
                ...creep.room.find(FIND_DROPPED_RESOURCES, {
                    filter: s => s.resourceType === RESOURCE_ENERGY,
                }),
                ...creep.room.find(FIND_TOMBSTONES, {
                    filter: s => s.store.energy > 0,
                }),
                ...creep.room.find(FIND_STRUCTURES, {
                    filter: s => [STRUCTURE_CONTAINER, STRUCTURE_STORAGE].includes(s.structureType) && s.store.energy > 0,
                }),
                ...creep.room.find(FIND_MY_CREEPS, {
                    filter: s => s.memory.state === STATES.STORE && s.carry.energy > 0,
                }),
            ]

            let best = creep.pos.findClosestByPath(sourceList)
            if (!best) {
                // console.log('cannot find a path to the source, it may due to a jam, in worker.harvest, by ' + creep.name)
                best = creep.pos.findClosestByRange(sourceList)
            }

            if (!best) {
                // TODO: try to harvest
                sayWithSufix(creep, '🔌⚠')
                tryChangeState(creep, STATES.IDLE)
                // creep.moveTo(creep.room.find(FIND_MY_SPAWNS)[0])
                return
            }

            if (best.pos.getRangeTo(creep) > 20 && creep.carry.energy >= 100) {
                console.log(`source target too far, energy enough, by ${creep.name}`)
                tryChangeState(creep, STATES.IDLE)
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
                tryChangeState(creep, STATES.IDLE)
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
            sayWithSufix(creep, '⚡')
            // TODO: if a working target have a nearly full energy, don not transfer to it, because it's too slow
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

        if (!creep.room.controller.my) {
            tryChangeState(creep, STATES.GO_HOME)
        }

        sayWithSufix(creep, '✨')
        if (Memory.messageToSign && Memory.messageToSign[creep.room.controller.id]) {
            const result = creep.signController(creep.room.controller, Memory.messageToSign[creep.room.controller.id])
            if (result === ERR_NOT_IN_RANGE) {
                moveTo(creep, creep.room.controller)
            } else if (result === OK) {
                delete Memory.messageToSign[creep.room.controller.id]
            }
        }
        const result = creep.upgradeController(creep.room.controller)
        if (result == ERR_NOT_IN_RANGE) {
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

        sayWithSufix(creep, '♻')
        moveToSpawnAndThen(creep, spawn => {
            const result = renewOrRecycle(spawn, creep)
            if (result === ERR_NOT_ENOUGH_ENERGY) {
                if (creep.carry.energy > 0) {
                    creep.transfer(spawn, RESOURCE_ENERGY)
                } else {
                    // tryChangeState(creep, STATES.IDLE)
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
            sayWithSufix(creep, '🔨')
            if (creep.repair(target) == ERR_NOT_IN_RANGE || adjecentSource(creep)) {
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
    [STATES.STORE](creep) {

        const targets = [
            ...creep.room.find(FIND_MY_CREEPS, {
                filter: c => c.memory.state === STATES.TAKE,
            }),
            ...creep.room.find(FIND_STRUCTURES, FIND_FILTERS.storeToStructure(creep)),
        ]

        // harvesting worker and containers has higher priority
        let target = creep.pos.findClosestByRange(targets)

        // to prevent from giving energy to a nearly full creep
        const CREEP_FULL_THRESHOLD = 10
        if (!target) {
            console.log(`try find nearest creep to give energy, by ${creep.name}`)
            target = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
                filter: c => c.memory.role !== creep.memory.role &&
                    c.carry.energy < c.carryCapacity - CREEP_FULL_THRESHOLD,
            })
        }

        if (target) {
            sayWithSufix(creep, '🔋')
            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                moveTo(creep, target)
            }
        } else {
            console.log(`cannot find a target to store energy, by ${creep.name}`)
            tryChangeState(creep, STATES.IDLE)
        }
    },
    /**
     * 
     * @param {Creep} creep 
     */
    [STATES.GO_HOME](creep) {
        sayWithSufix(creep, '🏠')
        moveToHomeAndThen(creep, () => tryChangeState(creep, STATES.IDLE))
    },
    /**
     * 
     * @param {Creep} creep 
     */
    [STATES.LONG_HARVEST](creep) {

        const TARGET_FLAG_COLOR = COLOR_PURPLE

        if (creep.carry.energy < creep.carryCapacity) {

            sayWithSufix(creep, '🔄🚞')

            // TODO: multiple flags
            const flag = _.filter(Game.flags, a => a.color === TARGET_FLAG_COLOR)[0]
            if (flag) {

                if (flag.pos.roomName !== creep.pos.roomName) {
                    moveTo(creep, flag, '#ffaa00')
                } else {

                    if (Memory.messageToSign && Memory.messageToSign[creep.room.controller.id]) {
                        const result = creep.signController(creep.room.controller, Memory.messageToSign[creep.room.controller.id])
                        if (result === ERR_NOT_IN_RANGE) {
                            moveTo(creep, creep.room.controller)
                            return
                        } else if (result === OK) {
                            delete Memory.messageToSign[creep.room.controller.id]
                        }
                    }

                    const source = creep.pos.findClosestByPath(FIND_SOURCES, {
                        filter: s => s.energy > 0,
                    })

                    if (!source) {
                        if (creep.carry.energy > 0) {
                            tryChangeState(creep, STATES.IDLE)
                        } else {
                            sayWithSufix(creep, '🔄⚠')
                        }
                    }

                    const result = creep.harvest(source)
                    if (result == ERR_NOT_IN_RANGE) {
                        moveTo(creep, source, '#ffaa00')
                    }
                }
            } else {
                console.log(`cannot find a flag to harvest, flag color needed: ${TARGET_FLAG_COLOR}, by ${creep.name}`)
                tryChangeState(creep, STATES.IDLE)
            }
        } else {
            tryChangeState(creep, STATES.IDLE)
        }
    },
}

// prevent changing state too much in a tick
const DISPATCH_RECURSIVE_THRESHOLD = 3

/**
 * @typedef DispatchOption
 * @property {number} minDyingTick
 * @property {Function}
 */

/**
 * 
 * @param {Creep} creep 
 * @param {Function} arrangeFunc 
 * @param {{minDyingTick: number, dyingCallBack: Function, noEnergyCallBack: Function}} option
 */
function dispatch(creep, arrangeFunc, option = {}, recursiveCount = 1) {

    option.minDyingTick = option.minDyingTick || 100
    // eslint-disable-next-line no-unused-vars
    option.dyingCallBack = option.dyingCallBack || (creep => STATES.RENEW)
    // eslint-disable-next-line no-unused-vars
    option.noEnergyCallBack = option.noEnergyCallBack || (creep => STATES.TAKE)

    ;
    (function () {
        if (creep.ticksToLive <= option.minDyingTick) {
            tryChangeState(creep, option.dyingCallBack(creep))
            return
        }
        if (creep.carry.energy === 0) {
            tryChangeState(creep, option.noEnergyCallBack(creep))
            return
        }
    })()

    if (!creep.memory.state) {
        tryChangeState(creep, STATES.IDLE)
    }

    if (creep.memory.state === STATES.IDLE) {
        tryChangeState(creep, arrangeFunc(creep, DISPATCH_RECURSIVE_THRESHOLD - recursiveCount))
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
        if (recursiveCount >= DISPATCH_RECURSIVE_THRESHOLD) {
            console.log(`reach dispatch recursive limit ${DISPATCH_RECURSIVE_THRESHOLD}, by ${creep.name}`)
            creep.say('💤' + creep.memory.role[0])
            return
        }
        // re-dispatch
        dispatch(creep, arrangeFunc, option, recursiveCount + 1)
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