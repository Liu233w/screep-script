const lib = require('./lib')

/**
 * 
 * @param {Creep} creep 
 */
function run(creep) {

    if (_.sum(creep.carry) === 0 && !creep.memory.toDie) {
        creep.memory.collect = true
    }

    if (creep.memory.collect) {

        if (_.sum(creep.carry) < creep.carryCapacity) {
            const invaderTomb = creep.room.find(FIND_TOMBSTONES, {
                filter: t => t.creep.owner.username === 'Invader',
            })[0]
            if (invaderTomb) {
                const resource = _.findKey(invaderTomb.store)
                if (resource) {
                    lib.sayWithSufix(creep, '🤚')
                    lib.moveToAndThen(creep, invaderTomb, () => creep.withdraw(invaderTomb, resource))
                    return
                }
            }
            
            // else
            const item = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES)
            if (item) {
                lib.moveToAndThen(creep, item, () => creep.pickup(item))
                return
            } else {
                creep.memory.collect = false
            }

            if (_.sum(creep.carry) <= 0) {
                // nothing to pickup and store
                creep.memory.collect = false
                creep.memory.toDie = true
            }
        } else {
            creep.memory.collect = false
        }
    }

    if (creep.memory.toDie) {
        lib.moveToSpawnAndThen(creep, spawn => spawn.recycleCreep(creep))
        return
    }

    // else
    const toStore = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER && _.sum(s.store) < s.storeCapacity,
    })
    if (!toStore) {
        creep.say('⚠📦', true)
        return
    }
    lib.moveToAndThen(creep, toStore, () => creep.transfer(toStore, _.findKey(creep.carry)))
}

module.exports.run = run