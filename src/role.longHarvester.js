const {
    moveToSpawnAndThen,
} = require('lib')

const sourceId = '5bbcae409099fc012e638a5e'

/**
 * 
 * @param {Creep} creep 
 */
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

            creep.say('🔄 harvest')

            const flag = _.filter(Game.flags, a => a.color === COLOR_PURPLE)[0]
            if (flag) {

                if (flag.pos.roomName !== creep.pos.roomName) {
                    moveTo(creep, flag, '#ffaa00')
                } else {

                    if (Memory.messageToSign && Memory.messageToSign[creep.room.controller.id]) {
                        const result = creep.signController(creep.room.controller, Memory.messageToSign[creep.room.controller.id])
                        if (result === ERR_NOT_IN_RANGE) {
                            moveTo(creep, creep.room.controller)
                            return
                        } else if (result === OK) {
                            delete Memory.messageToSign[creep.room.controller.id]
                        }
                    }

                    const source = creep.pos.findClosestByPath(FIND_SOURCES)
                    if (source) {
                        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                            moveTo(creep, source, '#ffaa00')
                        }
                    }
                }
            } else {
                creep.say('💤 idle')
                moveToSpawnAndThen(creep)
            }
        } else {
            creep.memory.harvest = false
        }

    } else {

        if (creep.carry.energy <= 0) {
            creep.memory.harvest = true
            return
        }

        creep.say('⚡ transfer')

        const spawn = Game.spawns['Spawn1'];
        if (creep.room !== spawn.room) {
            moveTo(creep, spawn)
        } else {

            let target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER &&
                    _.sum(s.store) < s.storeCapacity
            })

            if (!target) {
                target = creep.pos.findClosestByPath(FIND_CREEPS, {
                    filter: creep => creep.carry.energy < creep.carryCapacity &&
                        creep.memory.role === 'worker'
                })
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
}

function moveTo(creep, target, stroke = '#ffffff') {
    return creep.moveTo(target, {
        visualizePathStyle: {
            stroke,
        }
    })
}

module.exports.run = run