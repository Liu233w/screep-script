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
        noEnergyCallBack: (() => {
            const hasHostile = detectHostile()
            if (hasHostile) {
                creep.memory.toDie = true
                return STATES.RENEW
            }
            return STATES.LONG_HARVEST
        }),
    })
}

const spawnStrategy = {
    bodyUnit: [WORK, CARRY, MOVE],
}

/**
 * @returns {string|null}
 */
function detectHostile() {
    const redFlag = _.filter(Game.flags, a => a.color === COLOR_RED)[0]
    return redFlag && redFlag.memory.hasHostile
}

/**
 * 
 * @param {Creep} creep 
 */
function arrange(creep, remainCount) {

    if (remainCount <= 0) {
        return STATES.UPGRADE
    }

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