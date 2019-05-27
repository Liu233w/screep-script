const {
    FIND_FILTERS
} = require('lib')

/**
 * 
 * @param {Creep} creep 
 */
function dispatch(creep) {

    (function () {

        if (!creep.memory.state) {
            tryChangeState(creep, STATES.IDLE)
        }

        if (creep.ticksToLive <= 100 && creep.body.length > 3) {
            tryChangeState(creep, STATES.RENEW)
            return
        }

        if (creep.carry.energy === 0) {
            tryChangeState(creep, STATES.HARVEST)
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
    } else if (creep.memory.state === STATES.REPAIR) {
        actions.repair(creep)
    } else {
        console.log(`illegal state: ${creep.memory.state}, in creep ${creep.name}`)
    }
}

function destruct(creepMemory) {}

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

    if (newState === STATES.IDLE) {
        // arrange a new job
        arrange(creep)
    }
}

function arrange(creep) {
    if (getWorkerCount(STATES.UPGRADE) < 1) {
        tryChangeState(creep, STATES.UPGRADE)
        return
    }

    const toTransfer = creep.room.find(FIND_STRUCTURES, FIND_FILTERS.transfer(creep))
    if (toTransfer.length * 2 > getWorkerCount(STATES.TRANSFER)) {
        tryChangeState(creep, STATES.TRANSFER)
        return
    }

    const toRepair = creep.room.find(FIND_STRUCTURES, FIND_FILTERS.repair(creep))
    let repairNumber = toRepair.length
    // if no tower in room, use more creep to repair
    if (creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        }).length <= 0) {
        repairNumber *= 2
    }
    if (repairNumber > getWorkerCount(STATES.REPAIR)) {
        tryChangeState(creep, STATES.REPAIR)
        return
    }

    const toBuild = creep.room.find(FIND_CONSTRUCTION_SITES)
    const waitProgress = _.reduce(toBuild, (sum, curr) => sum + (curr.progressTotal - curr.progress), 0)
    const buildNumber = Math.floor(waitProgress / 5000)
    console.log(`progress wait to build: ${waitProgress}, builder number: ${buildNumber}`)
    if (buildNumber > getWorkerCount(STATES.BUILD)) {
        tryChangeState(creep, STATES.BUILD)
        return
    }

    tryChangeState(creep, STATES.UPGRADE)
    return
}

function getWorkerCount(state) {

    let cnt = 0
    for (let name in Game.creeps) {
        const m = Game.creeps[name].memory
        if (m.role === 'worker' && m.state === state) {
            cnt += 1
        }
    }
    return cnt
}

const actions = {

    /**
     *  
     * @param {Creep} creep 
     */
    harvest(creep) {
        if (creep.carry.energy < creep.carryCapacity) {

            creep.say('💡')

            const sourceList = [
                // ...creep.room.find(FIND_SOURCES),
                ...creep.room.find(FIND_DROPPED_RESOURCES, {
                    filter: s => s.resourceType === RESOURCE_ENERGY
                }),
                ...creep.room.find(FIND_TOMBSTONES, {
                    filter: s => s.store.energy > 0
                }),
                ...creep.room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER &&
                        s.store.energy > 0
                }),
                ...creep.room.find(FIND_CREEPS, {
                    filter: s => ['longHarvester', 'harvester'].includes(s.memory.role) &&
                        s.carry.energy > 0 && !s.memory.harvest
                }),
            ]

            let best = creep.pos.findClosestByPath(sourceList)
            if (best === null) {
                // console.log('cannot find a path to the source, it may due to a jam, in worker.harvest, by ' + creep.name)
                best = creep.pos.findClosestByRange(sourceList)
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
    transfer(creep) {
        const target = creep.pos.findClosestByRange(FIND_STRUCTURES, FIND_FILTERS.transfer(creep));
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
    upgrade(creep) {
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
    build(creep) {
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
    renew(creep) {

        if (creep.ticksToLive >= 1400) {
            tryChangeState(creep, STATES.IDLE)
            return
        }

        creep.say('🔁')

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
    /**
     * 
     * @param {Creep} creep 
     */
    repair(creep) {
        const target = creep.pos.findClosestByRange(FIND_STRUCTURES, FIND_FILTERS.repair(creep))
        if (target) {
            creep.say('🔨')
            if (creep.repair(target) == ERR_NOT_IN_RANGE || adjecentSource(creep)) {
                moveTo(creep, target)
            }
        } else {
            tryChangeState(creep, STATES.IDLE)
        }
    }
}

function moveTo(creep, target, stroke = '#ffffff') {
    creep.moveTo(target, {
        visualizePathStyle: {
            stroke,
        }
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

const STATES = {
    IDLE: 'idle',
    HARVEST: 'harvest',
    BUILD: 'build',
    UPGRADE: 'upgrade',
    TRANSFER: 'transfer',
    RENEW: 'renew',
    REPAIR: 'repair',
}

module.exports.run = dispatch
module.exports.destruct = destruct