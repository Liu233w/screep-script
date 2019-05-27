const {
    FIND_FILTERS,
} = require('./lib')

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
    const transferNumber = Math.min(Math.ceil(transferEnergy / 100), toTransfer.length)
    const carrierCount = getRoleCount(creep.room, 'carrier')
    if (transferNumber > carrierCount) {
        if (transferNumber > getWorkerCount(creep.room, STATES.TRANSFER)) {
            console.log(`doing carrier's job, need transfer count ${transferNumber}`)
            return STATES.TRANSFER
        }
    }

    const toRepair = creep.room.find(FIND_STRUCTURES, FIND_FILTERS.repair(creep))
    let repairNumber = toRepair.length
    // if no tower in room, use more creep to repair
    if (creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER,
        }).length <= 0) {
        repairNumber *= 2
    }
    if (repairNumber > getWorkerCount(creep.room, STATES.REPAIR)) {
        return STATES.REPAIR
    }

    const toBuild = creep.room.find(FIND_CONSTRUCTION_SITES)
    const waitProgress = _.reduce(toBuild, (sum, curr) => sum + (curr.progressTotal - curr.progress), 0)
    const buildNumber = Math.ceil(waitProgress / 5000)
    console.log(`progress wait to build: ${waitProgress}, builder number: ${buildNumber}`)
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
    return stateMachine.getStateCount(room.name, 'worker', state)
}

function getRoleCount(room, role) {
    return stateMachine.getRoleCount(room.name, role)
}

module.exports = {
    run,
    spawnStrategy,
}