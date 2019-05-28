const stateMachine = require('./stateMachine')

const {
    STATES,
} = stateMachine

function run(creep) {
    stateMachine.dispatch(creep, arrange, {
        noEnergyCallBack: (() => STATES.HARVEST),
    })
}

const spawnStrategy = {
    bodyUnit: [WORK, CARRY, MOVE],
    baseBody: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE],
}

// eslint-disable-next-line no-unused-vars
/**
 * 
 * @param {Creep} creep 
 */
function arrange(creep, remainDispatchCount) {
    if (remainDispatchCount <= 0) {
        // no target to store
        return STATES.TRANSFER
    } else {
        return STATES.STORE
    }
}

module.exports = {
    run,
    spawnStrategy,
}