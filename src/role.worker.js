const {
    FIND_FILTERS,
} = require('./lib')

const utils = require('./utils')

const stateMachine = require('./stateMachine')

const {
    STATES,
} = stateMachine

function run(creep) {
    stateMachine.dispatch(creep, arrange)
}

const spawnStrategy = {
    bodyUnit: [WORK, CARRY, MOVE],
    // TODO: min body repeat number to renew
}

/**
 * 
 * @param {Creep} creep 
 */
function arrange(creep) {

    if (getWorkerCount(creep.room, STATES.UPGRADE) < 1) {
        return STATES.UPGRADE
    }

    const toTransfer = creep.room.find(FIND_STRUCTURES, FIND_FILTERS.transfer(creep))
    /**
     * @type {StructureExtension[]}
     */
    const transferEnergy = _.reduce(toTransfer, (sum, curr) => sum + (curr.energyCapacity - curr.energy), 0)
    const carrierMaxEnergy = _.reduce(creep.room.find(FIND_MY_CREEPS, {
        filter: c => c.memory.role === 'carrier',
    }), (sum, curr) => sum + curr.carryCapacity, 0)
    if (transferEnergy > carrierMaxEnergy + creep.carryCapacity) {
        console.log(`doing carrier's job, need energy ${transferEnergy}, while carriers' capacity ${carrierMaxEnergy}`)
        return STATES.TRANSFER
    }

    // if tower in room, do not use creep to repair
    const towers = creep.room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_TOWER,
    })
    if (towers.length <= 0) {
        const toRepair = creep.room.find(FIND_STRUCTURES, FIND_FILTERS.repair(creep))
        const repairAmount = utils.sumBy(toRepair, a => a.hitsMax - a.hits)
        const repairNumber = repairAmount / 500000 // TODO: more precise number ?
        if (Math.floor(repairNumber) > getWorkerCount(creep.room, STATES.REPAIR)) {
            return STATES.REPAIR
        }
    }

    /*
    const toRepair = creep.room.find(FIND_STRUCTURES, FIND_FILTERS.repair(creep))
    const repairAmount = utils.sumBy(toRepair, a => a.hitsMax - a.hits)
    // if tower in room, use less creep to repair
    const towers = creep.room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_TOWER,
    })
    const towerCanRepair = utils.sumBy(towers, a => a.energy) / 0.1
    const repairNumber = (repairAmount - towerCanRepair) / 5000 // TODO: more precise number ?
    // console.log(`repairNumber: ${repairNumber}`)
    // TODO: should i repair structure and road when tower not available ?
    // may be not. only should we repair wall using creep, see https://github.com/TooAngel/screeps/blob/master/src/role_repairer.js
    if (Math.floor(repairNumber) > getWorkerCount(creep.room, STATES.REPAIR)) {
        return STATES.REPAIR
    }
    */

    const toBuild = creep.room.find(FIND_CONSTRUCTION_SITES)
    const waitProgress = _.reduce(toBuild, (sum, curr) => sum + (curr.progressTotal - curr.progress), 0)
    const buildNumber = Math.ceil(waitProgress / 5000)
    // console.log(`progress wait to build: ${waitProgress}, builder number: ${buildNumber}`)
    if (buildNumber > getWorkerCount(creep.room, STATES.BUILD)) {
        return STATES.BUILD
    }

    return STATES.UPGRADE
}

/**
 * 
 * @param {Room} room 
 * @param {String} state 
 */
function getWorkerCount(room, state) {
    const stateCount = stateMachine.getStateCount(room.name, 'worker', state)
    // console.log(`state count: ${stateCount}`)
    return stateCount
}

module.exports = {
    run,
    spawnStrategy,
}