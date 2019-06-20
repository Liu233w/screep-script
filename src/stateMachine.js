const {
    moveToSpawnAndThen,
    FIND_FILTERS,
    renewOrRecycle,
    adjecentSource,
    moveToHomeAndThen,
    sayWithSufix,
    moveToAndThen,
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
    DESTRUCT: 'destruct',
}

const utils = require('./utils')

/*
TODO: take distance into consideration when arrange job
*/

/*
TODO: try empty self if it is going to renew.
if a container or empty structure is nearby (or on the road to spawn), transfer energy first
*/

/*
TODO: when moving, avoid the road beside sources, the harvester may be there
TODO: assign harvester to a specific location, so they can avoid each other, and position can be cached in memory and let other get them when find route
*/

/*
TODO: add creep memory (log), record every job executed in a tick, its target and the result
have a max log size, if exceed, remove oldest log
*/

const ACTIONS = {
    /**
     * 
     * @param {Creep} creep 
     */
    [STATES.BUILD](creep) {
        // TODO: if a nearly finished structure is nearby, try build it first
        const target = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES)
        if (target) {
            sayWithSufix(creep, '🚧')
            if (creep.build(target) == ERR_NOT_IN_RANGE || adjecentSource(creep)) {
                creep.travelTo(target)
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

            // if there are energy resources under foot, pick them up
            const resource = creep.pos.lookFor(RESOURCE_ENERGY)
            if (resource[0]) {
                creep.pickup(resource[0])
                return
            }

            /**
             * @type {Source}
             */
            let source
            if (creep.memory.sourceTarget) {
                source = Game.getObjectById(creep.memory.sourceTarget)
                // console.log(`find a source, ${source.id}`)
                // if (source && source.energy < 0) {
                //     source = null
                // }
            } else if (creep.memory.target) {
                source = Game.getObjectById(creep.memory.target)
            } else {
                const sources = creep.room.find(FIND_SOURCES, {
                    filter: s => s.energy > 0,
                })
                const targetCount = _.countBy(_.filter(creep.room.find(FIND_MY_CREEPS), c => c.memory.state === STATES.HARVEST), c => c.target)
                // least creep used source
                const source = utils.minBy(sources, s => targetCount[s.id] || 0)
                // console.log(`assigned a new target to harvest, by ${creep.name}`)
                creep.memory.target = source ? source.id : null
            }

            if (!source) {
                if (creep.carry.energy > 0) {
                    tryChangeState(creep, STATES.IDLE)
                } else {
                    // TODO: move off the road ?
                    // TODO: try changing role temporary when source refreshing time is too long ?
                    //       can change to a longHarvester ? (may be move too slow)
                    sayWithSufix(creep, '🔄⚠')
                }
                return
            }

            // a harvester with a target, and source drained
            if (source.energy <= 0) {
                if (creep.carry.energy > 0) {
                    tryChangeState(creep, STATES.IDLE)
                } else {
                    creep.travelTo(source)
                    sayWithSufix(creep, '🔄⚠')
                    creep.memory.target = null
                }
                return
            }

            const result = creep.harvest(source)
            if (result === ERR_NOT_IN_RANGE) {
                creep.travelTo(source)
                return
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
                    filter: s => s.memory.state === STATES.STORE && s.carry.energy > 0 && s.memory.role !== creep.memory.role,
                }),
            ]

            let best = creep.pos.findClosestByPath(sourceList)
            if (!best) {
                // console.log('cannot find a path to the source, it may due to a jam, in worker.harvest, by ' + creep.name)
                best = creep.pos.findClosestByRange(sourceList)
            }

            if (!best) {
                // TODO: try to harvest ? not work for carrier though
                sayWithSufix(creep, '🔌⚠')
                // console.log(`nothing to take, by ${creep.name}`)
                tryChangeState(creep, STATES.IDLE)
                // TODO: try move to spawn to pick up dead creep body? can check if a 'toDie' creep is going to spawn point 
                return
            }

            if (best.pos.getRangeTo(creep) > 20 && creep.carry.energy >= 100) {
                // console.log(`source target too far, energy enough, by ${creep.name}`)
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
                creep.travelTo(best, {
                    movingTarget: best instanceof Creep,
                })
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

        // if a working target have a nearly full energy, don not transfer to it, because it's too slow
        // to prevent from this situation, find a lowest energy structure beside it to transfer.
        const TRANSFER_RADIUS = 3

        let target
        // when attacked, transfer to tower first
        if (creep.room.find(FIND_HOSTILE_CREEPS).length > 0) {
            target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_TOWER,
            })
        }

        if (!target) {
            target = creep.pos.findClosestByRange(FIND_STRUCTURES, FIND_FILTERS.transfer(creep))
        }

        if (target) {
            sayWithSufix(creep, '⚡')

            const targets = target.pos.findInRange(FIND_MY_STRUCTURES, TRANSFER_RADIUS, FIND_FILTERS.transfer(creep))
            target = utils.minBy(targets, t => t.energy)

            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE || adjecentSource(creep)) {
                creep.travelTo(target)
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
                creep.travelTo(creep.room.controller)
            } else if (result === OK) {
                delete Memory.messageToSign[creep.room.controller.id]
            }
        }
        const result = creep.upgradeController(creep.room.controller)
        if (result == ERR_NOT_IN_RANGE) {
            creep.travelTo(creep.room.controller)
        }
    },
    /**
     * 
     * @param {Creep} creep 
     */
    [STATES.RENEW](creep) {
        if (!creep.memory.toDie && creep.ticksToLive >= 1400) {
            // console.log(`finish renew, change to IDLE, by ${creep.name}`)
            tryChangeState(creep, STATES.IDLE)
            return
        }

        sayWithSufix(creep, '♻')
        moveToSpawnAndThen(creep, spawn => {
            const result = renewOrRecycle(spawn, creep)
            // console.log(`renew result ${result}, by ${creep.name}`)
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

        // TODO: try fix some bigger damaged one, sorted by damaged point

        const towers = creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER,
        })
        let target
        if (towers.length > 0) {
            target = creep.pos.findClosestByRange(FIND_STRUCTURES, FIND_FILTERS.repair(creep, s => s.hitsMax - s.hits > 200))
        } else {
            target = creep.pos.findClosestByRange(FIND_STRUCTURES, FIND_FILTERS.repair(creep))
        }

        if (target) {
            sayWithSufix(creep, '🔨')
            if (creep.repair(target) == ERR_NOT_IN_RANGE || adjecentSource(creep)) {
                creep.travelTo(target)
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

        // not suitable, should go home
        // to prevent from giving energy to a nearly full creep
        /*
        const CREEP_FULL_THRESHOLD = 10
        if (!target) {
            console.log(`try find nearest creep to give energy, by ${creep.name}`)
            target = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
                filter: c => c.memory.role !== creep.memory.role &&
                    c.carry.energy < c.carryCapacity - CREEP_FULL_THRESHOLD,
            })
        }
        */

        if (target) {
            sayWithSufix(creep, '🔋')
            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.travelTo(target, {
                    movingTarget: target instanceof Creep,
                })
            }
        } else {
            console.log(`cannot find a target to store energy, by ${creep.name}`)
            // tryChangeState(creep, STATES.IDLE)
            if (creep.room.name !== Game.spawns[creep.memory.spawn].room.name) {
                tryChangeState(creep, STATES.GO_HOME)
            } else {
                tryChangeState(creep, STATES.IDLE)
            }
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
                    creep.travelTo(flag)
                } else {

                    let sources = creep.room.find(FIND_SOURCES, {
                        filter: s => s.energy > 0,
                    })

                    if (sources.length <= 0) {
                        if (creep.carry.energy > 0) {
                            // return its energy
                            tryChangeState(creep, STATES.IDLE)
                            return
                        } else {
                            // still try to move to source to save time
                            // Game.notify(`source drained, at ${Game.time}`, 30)
                            sayWithSufix(creep, '🔄⚠')
                            sources = creep.room.find(FIND_SOURCES)
                        }
                    }

                    let source = creep.pos.findClosestByPath(sources)

                    if (!source) {
                        // source occupied, trying to move to the closest one
                        source = creep.pos.findClosestByRange(sources)
                    }

                    if (!source) {
                        throw new Error(`cannot find a source in this room, this can be a bug, by ${creep.name}`)
                    }

                    const result = creep.harvest(source)
                    if (result == ERR_NOT_IN_RANGE) {
                        creep.travelTo(source)
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
    /**
     * 
     * @param {Creep} creep 
     */
    [STATES.DESTRUCT](creep) {

        if (creep.carry.energy >= creep.carryCapacity) {
            tryChangeState(creep, STATES.IDLE)
            return
        }

        const TARGET_FLAG_COLOR = COLOR_GREY
        const flag = creep.pos.findClosestByRange(FIND_FLAGS, {
            filter: f => f.color === TARGET_FLAG_COLOR,
        })
        if (flag) {
            const structure = flag.pos.lookFor(LOOK_STRUCTURES)[0]
            if (structure) {
                sayWithSufix(creep, '💣')
                moveToAndThen(creep, structure, () => creep.dismantle(structure))
                // console.log(`res: ${res}, by ${creep.name}`)
            } else {
                // console.log(`destruct done, by ${creep.name}`)
                tryChangeState(creep, STATES.TAKE)
                flag.remove()
                return
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
 * @param {{minDyingTick: number, dyingCallBack: function(creep), noEnergyCallBack: function(creep)}} option
 */
function dispatch(creep, arrangeFunc, option = {}, recursiveCount = 1) {

    // creep is still spawning
    if (creep.spawning) {
        return
    }

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
        // FIXME: dyingCallback may not work in this situation
        // because dyingCallBack may not return RENEW at all
        if (creep.memory.state === STATES.RENEW) {
            return
        }
        // FIXME: if creep donot have CARRY, it is null, so the condition is always false
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
            // console.log(`reach dispatch recursive limit ${DISPATCH_RECURSIVE_THRESHOLD}, by ${creep.name}`)
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
        // console.log(`same state, dont have to change ${oldState}, by ${creep.name}`)
        return
    }

    // console.log(`creep ${creep.name} change state from ${oldState} to ${newState}`)

    // callback functions ...
    // TODO: optimise
    updateRoleStateCount(creep.memory.spawn, creep.memory.role, oldState, -1)
    updateRoleStateCount(creep.memory.spawn, creep.memory.role, newState, +1)
    updateStateCount(creep.memory.spawn, oldState, -1)
    updateStateCount(creep.memory.spawn, newState, +1)

    creep.memory.target = target

    // end callback functions

    creep.memory.state = newState
}

function global() {
    const creepRoleStates = _.countBy(Game.creeps, c => `${c.memory.spawn}.${c.memory.role}.${c.memory.state}`)
    const creepRoles = _.countBy(Game.creeps, c => `${c.memory.spawn}.${c.memory.role}`)
    const creepStates = _.countBy(Game.creeps, c => `${c.memory.spawn}.${c.memory.state}`)
    Memory.creepRoleStates = creepRoleStates
    Memory.creepStates = creepStates
    Memory.creepRoles = creepRoles
}

function getRoleStateCount(spawnName, role, state) {
    const key = `${spawnName}.${role}.${state}`
    // console.log('key', key)
    return Memory.creepRoleStates[key] || 0
}

function updateRoleStateCount(spawnName, role, state, change) {
    const key = `${spawnName}.${role}.${state}`
    const orig = Memory.creepRoleStates[key] || 0
    Memory.creepRoleStates[key] = orig + change
}

function getRoleCount(spawnName, role) {
    return Memory.creepRoles[`${spawnName}.${role}`] || 0
}

function getStateCount(spawnName, state) {
    const key = `${spawnName}.${state}`
    return Memory.creepStates[key] || 0
}

function updateStateCount(spawnName, state, change) {
    const key = `${spawnName}.${state}`
    const orig = Memory.creepStates[key] || 0
    Memory.creepStates[key] = orig + change
}

module.exports = {
    STATES,
    dispatch,
    ACTIONS,
    global,
    getRoleStateCount,
    getRoleCount,
    getStateCount,
}