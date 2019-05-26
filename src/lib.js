module.exports = {
    /**
     * 
     * @param {Creep} creep 
     * @param {Funtion} callBack 
     */
    moveToSpawnAndThen: function (creep, callBack) {
        let mySpawn = creep.room.find(FIND_MY_SPAWNS)[0]
        if (!mySpawn) {
            mySpawn = Game.spawns['Spawn1']
        }
        if (mySpawn) {
            if (!creep.pos.inRangeTo(mySpawn, SPAWN_RENEW_RATIO)) {
                moveTo(creep, mySpawn, "#00ff00")
            } else {
                if (callBack) {
                    callBack(mySpawn)
                }
            }
        } else {
            console.info('cannot find a spawn, by ', creep.name)
        }
    },
    moveTo,
    FIND_FILTERS: {
        transfer: locateable => ({
            filter: (structure) => {
                return (
                    structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_TOWER
                ) && structure.energy < structure.energyCapacity
            }
        }),
        repair: locateable => ({
            filter: structure => {
                if (_.includes(Memory.notRepairIds, structure.id) ||
                    _.find(locateable.room.lookForAt(LOOK_FLAGS, structure.pos), flag => flag.color === COLOR_RED)) {
                    // don't need to repair
                    return false
                }

                // don't need to fill rampart
                if (structure.structureType === STRUCTURE_RAMPART) {
                    return structure.hits < 50000
                }

                return structure.hits < structure.hitsMax
            }
        }),
    },
}

function moveTo(creep, target, stroke = '#ffffff') {
    return creep.moveTo(target, {
        visualizePathStyle: {
            stroke,
        }
    })
}