const lib = require('./lib')

/**
 * 
 * @param {Creep} creep 
 */
function run(creep) {

    if (_.sum(creep.carry) < creep.carryCapacity) {
        const invaderTomb = creep.room.find(FIND_TOMBSTONES, {
            filter: t => t.creep.owner.username === 'Invader',
        })[0]
        if (invaderTomb) {
            const resource = _.findKey(invaderTomb.store)
            if (resource) {
                lib.moveToAndThen(creep, invaderTomb, () => creep.withdraw(invaderTomb, resource))
                return
            }

            creep.say('empty')
        }
    }

    const toStore = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER && _.sum(s.store) < s.storeCapacity,
    })
    if (!toStore) {
        creep.say('⚠📦', true)
        return
    }
    lib.moveToAndThen(creep, toStore, () => creep.transfer(toStore, _.findKey(toStore.store)))

}

module.exports.run = run