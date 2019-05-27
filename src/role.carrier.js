const stateMachine = require('./stateMachine')

const {
    STATES,
} = stateMachine

function run(creep) {
    stateMachine.dispatch(creep, arrange)
}

const spawnStrategy = {
    bodyUnit: [CARRY, MOVE],
    // TODO: min body repeat number to renew
}

// eslint-disable-next-line no-unused-vars
function arrange(creep) {

    return STATES.TRANSFER
}

module.exports = {
    run,
    spawnStrategy,
}