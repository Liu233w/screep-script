const {
    moveTo,
    moveToSpawnAndThen,
    FIND_FILTERS,
} = require('lib')


/** @param {Creep} creep **/
function run(creep) {

    if (creep.ticksToLive <= 100 || creep.memory.renewing) {
        creep.say('🔁 renew')
        creep.memory.renewing = true

        if (creep.ticksToLive >= 1400) {
            creep.memory.renewing = false
        } else {
            moveToSpawnAndThen(creep, spawn => spawn.renewCreep(creep))
            return
        }
    }

    if (creep.memory.harvest) {
        if (creep.carry.energy < creep.carryCapacity) {

            creep.say('🔄')
            const source = creep.pos.findClosestByPath(FIND_SOURCES);
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                moveTo(creep, source)
            }
        } else {
            creep.memory.harvest = false
            return run(creep)
        }

    } else {

        if (creep.carry.energy <= 0) {
            creep.memory.harvest = true
            return run(creep)
        }

        creep.say('🔋')

        const workers = creep.room.find(FIND_CREEPS, {
            filter: creep => creep.carry.energy < creep.carryCapacity &&
                creep.memory.role === 'worker'
        })

        // harvesting worker has higher priority
        let target = creep.pos.findClosestByRange(workers, t => t.memory.state === 'harvest')

        if (!target) {
            console.log(`try find nearest available container, by ${creep.name}`)
            target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER &&
                    _.sum(s.store) < s.storeCapacity
            })
        }

        if (!target) {
            console.log(`try find nearest available worker, by ${creep.name}`)
            target = creep.pos.findClosestByRange(workers)
        }

        if (!target) {
            console.log(`try find nearest structure to transfer, by ${creep.name}`)
            target = creep.pos.findClosestByRange(FIND_STRUCTURES, FIND_FILTERS.transfer(creep))
        }

        if (target) {
            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                moveTo(creep, target)
            }
        } else {
            console.log(`cannot find a target to transfer energy, by ${creep.name}`)
        }
    }
}

module.exports.run = run