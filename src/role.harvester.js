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

    // if a container under construction, build it
    const BUILD_CONTAINER_RADIUS = 3
    /**
     * @type {Source|null}
     */
    const sourceTarget = Game.getObjectById(creep.memory.sourceTarget)
    if (sourceTarget) {
        const containerConstruction = sourceTarget.pos.findInRange(FIND_CONSTRUCTION_SITES, BUILD_CONTAINER_RADIUS, {
            filter: s => s.structureType === STRUCTURE_CONTAINER,
        })[0]
        if (containerConstruction) {
            return STATES.BUILD
        }
    }

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