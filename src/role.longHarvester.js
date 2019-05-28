const stateMachine = require('./stateMachine')

const {
    STATES,
} = stateMachine

const {
    FIND_FILTERS,
} = require('./lib')

function run(creep) {
    stateMachine.dispatch(creep, arrange, {
        minDyingTick: 200,
        noEnergyCallBack: (() => STATES.LONG_HARVEST),
    })
}

const spawnStrategy = {
    bodyUnit: [WORK, CARRY, MOVE],
}

/**
 * 
 * @param {Creep} creep 
 */
function arrange(creep) {
    if (creep.room.find(FIND_STRUCTURES, FIND_FILTERS.storeToStructure(creep)).length > 0) {
        return STATES.STORE
    } else {
        return STATES.GO_HOME
    }
}

module.exports = {
    run,
    spawnStrategy,
}