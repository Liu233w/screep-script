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

function arrange(creep) {

    if (getWorkerCount(STATES.UPGRADE) < 1) {
        return STATES.UPGRADE
    }

    /**
     * @type {StructureExtension[]}
     */
    const toTransfer = creep.room.find(FIND_STRUCTURES, FIND_FILTERS.transfer(creep))
    const transferEnergy = _.reduce(toTransfer, (sum, curr) => sum + (curr.energyCapacity - curr.energy), 0)
    const transferNumber = Math.min(Math.ceil(transferEnergy / 100), toTransfer.length)
    console.log(`energy wait to transfer: ${transferEnergy}, transferer number: ${transferNumber}`)
    if (transferNumber > getWorkerCount(STATES.TRANSFER)) {
        return STATES.TRANSFER
    }

    const toRepair = creep.room.find(FIND_STRUCTURES, FIND_FILTERS.repair(creep))
    let repairNumber = toRepair.length
    // if no tower in room, use more creep to repair
    if (creep.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER,
        }).length <= 0) {
        repairNumber *= 2
    }
    if (repairNumber > getWorkerCount(STATES.REPAIR)) {
        return STATES.REPAIR
    }

    const toBuild = creep.room.find(FIND_CONSTRUCTION_SITES)
    const waitProgress = _.reduce(toBuild, (sum, curr) => sum + (curr.progressTotal - curr.progress), 0)
    const buildNumber = Math.ceil(waitProgress / 5000)
    console.log(`progress wait to build: ${waitProgress}, builder number: ${buildNumber}`)
    if (buildNumber > getWorkerCount(STATES.BUILD)) {
        return creep, STATES.BUILD
    }

    return STATES.UPGRADE
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

module.exports = {
    run,
    spawnStrategy,
}