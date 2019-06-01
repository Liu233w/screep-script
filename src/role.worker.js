const {
    FIND_FILTERS,
    checkCreepRole,
} = require('./lib')

const utils = require('./utils')

const stateMachine = require('./stateMachine')

const {
    STATES,
} = stateMachine

function run(creep) {
    stateMachine.dispatch(creep, arrange, {
        noEnergyCallBack,
    })
}

function noEnergyCallBack(creep) {
    const tombStone = creep.pos.findClosestByRange(FIND_TOMBSTONES, {
        filter: t => t.store.energy > 0 && t.pos.getRangeTo(creep) < 20,
    })
    if (tombStone && tombStone.length > 0) {
        return STATES.TAKE
    }

    if (creep.room.find(FIND_FLAGS, {
            filter: f => f.color === COLOR_GREY,
        }).length > 0) {
        return STATES.DESTRUCT
    }

    // TODO: too tight here ?
    // try save role should count in memory ?
    // if a harvester are in renewing or no enough harvester, do its job
    // TODO: try to use the target that have leaest harvester ?
    const harvesterCount = _.countBy(Game.creeps, c => checkCreepRole(c, creep.memory.spawn, 'harvester') && c.memory.state === STATES.HARVEST)
    const harvesterShouldCount = creep.room.find(FIND_SOURCES).length * 2
    if (harvesterCount + stateMachine.getRoleStateCount(creep.memory.spawn, 'worker', STATES.HARVEST) < harvesterShouldCount) {
        return STATES.HARVEST
    } else {
        return STATES.TAKE
    }
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

    // TODO: how about sending worker to other rooms ?
    if (stateMachine.getRoleCount(creep.memory.spawn, 'worker') > 1 && getWorkerCount(creep, STATES.UPGRADE) < 1) {
        return STATES.UPGRADE
    }

    const toTransfer = creep.room.find(FIND_STRUCTURES, FIND_FILTERS.transfer(creep))
    /**
     * @type {StructureExtension[]}
     */
    const transferEnergy = _.reduce(toTransfer, (sum, curr) => sum + (curr.energyCapacity - curr.energy), 0)
    const carrierMaxEnergy = _.reduce(creep.room.find(FIND_MY_CREEPS, {
        // IDLE carrier means it cannot find a place to take energy
        filter: c => c.memory.role === 'carrier' && c.memory.state !== STATES.IDLE,
    }), (sum, curr) => sum + curr.carryCapacity, 0)
    if (transferEnergy > carrierMaxEnergy * 2) {
        console.log(`doing carrier's job, need energy ${transferEnergy}, while carriers' capacity*2 =  ${carrierMaxEnergy*2}`)
        return STATES.TRANSFER
    }

    // if tower in room, do not use creep to repair
    // TODO: when badly damaged structure occured, still to rapair no matter if tower exists
    const towers = creep.room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_TOWER,
    })
    if (towers.length <= 0) {
        const toRepair = creep.room.find(FIND_STRUCTURES, FIND_FILTERS.repair(creep))
        const repairAmount = utils.sumBy(toRepair, a => a.hitsMax - a.hits)
        const repairNumber = repairAmount / 500000 // TODO: more precise number ?
        if (Math.floor(repairNumber) > getWorkerCount(creep, STATES.REPAIR)) {
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
    if (Math.floor(repairNumber) > getWorkerCount(creep, STATES.REPAIR)) {
        return STATES.REPAIR
    }
    */

    const toBuild = creep.room.find(FIND_CONSTRUCTION_SITES)
    const waitProgress = _.reduce(toBuild, (sum, curr) => sum + (curr.progressTotal - curr.progress), 0)
    const buildNumber = Math.ceil(waitProgress / 5000)
    // console.log(`progress wait to build: ${waitProgress}, builder number: ${buildNumber}`)
    if (buildNumber > getWorkerCount(creep, STATES.BUILD)) {
        return STATES.BUILD
    }

    return STATES.UPGRADE
}

/**
 * 
 * @param {Creep} creep
 * @param {String} state 
 */
function getWorkerCount(creep, state) {
    const stateCount = stateMachine.getRoleStateCount(creep.memory.spawn, 'worker', state)
    // console.log(`state count: ${stateCount}`)
    return stateCount
}

module.exports = {
    run,
    spawnStrategy,
}