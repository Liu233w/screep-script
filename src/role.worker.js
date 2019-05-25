function beforeAll(creeps) {

    Memory.sourceWorkerCount = _.countBy(creeps, 'memory.source')
}

/**
 * 
 * @param {Creep} creep 
 */
function dispatch(creep) {

    (function () {

        if (creep.ticksToLive <= 100 && creep.body.length > 3) {
            tryChangeState(creep, STATES.RENEW)
            return
        }

        if (creep.carry.energy === 0) {
            tryChangeState(creep, STATES.HARVEST)
            return
        }

        if (creep.memory.state === STATES.IDLE || !creep.memory.state) {

            if (getWorkerCount(STATES.UPGRADE) < 1) {
                tryChangeState(creep, STATES.UPGRADE)
                return
            }

            const toTransfer = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (
                        structure.structureType == STRUCTURE_EXTENSION ||
                        structure.structureType == STRUCTURE_SPAWN ||
                        structure.structureType == STRUCTURE_TOWER
                    ) && structure.energy < structure.energyCapacity
                }
            })
            if (toTransfer.length > getWorkerCount(STATES.TRANSFER)) {
                tryChangeState(creep, STATES.TRANSFER)
                return
            }

            const toBuild = creep.room.find(FIND_CONSTRUCTION_SITES)
            if (toBuild.length > getWorkerCount(STATES.BUILD)) {
                tryChangeState(creep, STATES.BUILD)
                return
            }

            tryChangeState(creep, STATES.upgrade)
            return
        }
    })()

    if (creep.memory.state === STATES.HARVEST) {
        actions.harvest(creep)
    } else if (creep.memory.state === STATES.TRANSFER) {
        actions.transfer(creep)
    } else if (creep.memory.state === STATES.UPGRADE) {
        actions.upgrade(creep)
    } else if (creep.memory.state === STATES.BUILD) {
        actions.build(creep)
    } else if (creep.memory.state === STATES.RENEW) {
        actions.renew(creep)
    } else {
        console.log(`illegal state: ${creep.memory.state}, in creep ${creep.name}`)
    }
}

function destruct(creepMemory) {
    if (creepMemory.state === STATES.HARVEST) {
        const id = creepMemory.source
    }
    Memory.workerCount[creepMemory.state] -= 1
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

    console.log(`creep ${creep.name} change state from ${oldState} to ${newState}`)

    // callback functions ...

    updateWorkerCount(oldState, newState)
    resetSource(oldState, creep)

    // end callback functions

    creep.memory.state = newState
}

function resetSource(oldState, creep) {
    if (oldState === STATES.HARVEST) {
        delete creep.memory.source
    }
}

function updateWorkerCount(oldState, newState) {
    if (oldState) {
        Memory.workerCount[oldState] -= 1
    }
    if (Memory.workerCount[newState]) {
        Memory.workerCount[newState] += 1
    } else {
        Memory.workerCount[newState] = 1
    }
}

function getWorkerCount(state) {
    if (Memory.workerCount) {
        return Memory.workerCount[state] || 0
    } else {
        return 0
    }
}

const SOURCE_CAPASICITY = {
    '5bbcae329099fc012e6388dc': 3,
    '5bbcae329099fc012e6388da': 1,
}
const DEFAULT_SOURCE_CAPASICITY = 2

/**
 * key: source id; value: available position for harvest
 * @param {Object} sources 
 */
function resolveSourceAvailable(sources) {
    const res = {}
    for (let item of sources) {
        const id = item.id
        if (!Memory.sourceWorkerCount[id]) {
            Memory.sourceWorkerCount[id] = 0
        }
        res[id] = (SOURCE_CAPASICITY[id] || DEFAULT_SOURCE_CAPASICITY) - Memory.sourceWorkerCount[id]
    }
    return res
}

function maxValue(obj) {
    let max = -Infinity
    for (let key in obj) {
        const item = obj[key]
        if (item > max) {
            max = item
        }
    }
    return max
}

// change to another source if meet a jam
const CHANGE_SOURCE_THRESHHOLD = 3

const actions = {

    /**
     *  
     * @param {Creep} creep 
     */
    harvest(creep) {
        if (creep.carry.energy < creep.carryCapacity) {

            creep.say('🔄 harvest')

            const currentSource = creep.memory.source
            const sources = creep.room.find(FIND_SOURCES)
            const sourceAvailables = resolveSourceAvailable(sources)

            if (!currentSource || sourceAvailables[currentSource] <= maxValue(sourceAvailables) - CHANGE_SOURCE_THRESHHOLD) {

                let biggest = -Infinity
                let bestSources = []

                let available = []

                for (let id in sourceAvailables) {
                    const sourceAvailable = sourceAvailables[id]
                    if (sourceAvailable > 0) {
                        available.push(id)
                    }

                    if (sourceAvailable === biggest) {
                        bestSources.push(id)
                    } else if (sourceAvailable > biggest) {
                        biggest = sourceAvailable
                        bestSources = [id]
                    }
                }

                const best = creep.pos.findClosestByPath(FIND_SOURCES, {
                    filter: source => available.includes(source.id) || bestSources.includes(source.id)
                })

                let bestId
                if (best === null) {
                    console.log('cannot find a path to the source, it may due to a jam, in worker.harvest, by ' + creep.name)
                    bestId = creep.pos.findClosestByRange(FIND_SOURCES).id
                } else {
                    bestId = best.id
                }

                creep.memory.source = bestId
            }

            const source = Game.getObjectById(creep.memory.source)
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                moveTo(creep, source, '#ffaa00')
            }
        } else {
            tryChangeState(creep, STATES.IDLE)
        }
    },
    /**
     * 
     * @param {Creep} creep 
     */
    transfer(creep) {
        const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_TOWER) && structure.energy < structure.energyCapacity
            }
        });
        if (target) {
            creep.say('⚡ transfer')
            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
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
    upgrade(creep) {
        creep.say('✨ upgrade')
        if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
            moveTo(creep, creep.room.controller)
        }
    },
    /**
     * 
     * @param {Creep} creep 
     */
    build(creep) {
        const target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES)
        if (target) {
            creep.say('🚧 build')
            if (creep.build(target) == ERR_NOT_IN_RANGE) {
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
    renew(creep) {

        if (creep.ticksToLive >= 1400) {
            tryChangeState(creep, STATES.IDLE)
            return
        }

        creep.say('🔁 renew')

        const mySpawn = creep.room.find(FIND_MY_SPAWNS)[0]
        if (mySpawn) {
            if (!creep.pos.inRangeTo(mySpawn, SPAWN_RENEW_RATIO)) {
                moveTo(creep, mySpawn)
            } else {
                mySpawn.renewCreep(creep)
            }
        } else {
            console.info('cannot find a spawn to renew, by ', creep.name)
        }
    },
}

function moveTo(creep, target, stroke = '#ffffff') {
    creep.moveTo(target, {
        visualizePathStyle: {
            stroke,
        }
    })
}

const STATES = {
    IDLE: 'idle',
    HARVEST: 'harvest',
    BUILD: 'build',
    UPGRADE: 'upgrade',
    TRANSFER: 'transfer',
    RENEW: 'renew',
}

module.exports.run = dispatch
module.exports.destruct = destruct
module.exports.beforeAll = beforeAll