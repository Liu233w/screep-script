const stateMachine = require('./stateMachine')

const {
    STATES,
} = stateMachine

function run(creep) {

    creep.memory.toDie = true

    stateMachine.dispatch(creep, arrange, {
        minDyingTick: 100,
        noEnergyCallBack: (() => STATES.RENEW),
    })
}

/**
 * 
 * @param {Creep} creep 
 */
function arrange(creep) {
    if (creep.carry.energy > 0) {
        return STATES.STORE
    } else {
        return STATES.RENEW
    }
}

module.exports = {
    run,
}