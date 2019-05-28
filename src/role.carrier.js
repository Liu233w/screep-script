const stateMachine = require('./stateMachine')

const {
    STATES,
} = stateMachine

const {
    FIND_FILTERS,
} = require('./lib')

function run(creep) {
    stateMachine.dispatch(creep, arrange)
}

const spawnStrategy = {
    bodyUnit: [CARRY, MOVE],
    // TODO: min body repeat number to renew
}

/**
 * 
 * @param {Creep} creep 
 */
function arrange(creep, remainDispatchCount) {

    if (remainDispatchCount <= 0) {
        return STATES.STORE
    }

    // FIXME: it is always true, why ?
    if (creep.room.find(FIND_STRUCTURES, FIND_FILTERS.transfer(creep))) {
        // console.log('try transfer')
        return STATES.TRANSFER
    } else {
        return STATES.STORE
    }
}

module.exports = {
    run,
    spawnStrategy,
}