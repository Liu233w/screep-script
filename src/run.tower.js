const {
    FIND_FILTERS,
} = require('lib')

function run() {

    for (let name in Game.structures) {

        /**
         * @type {StructureTower}
         */
        const item = Game.structures[name]
        if (item.structureType !== STRUCTURE_TOWER) {
            continue
        }
        
        const closestHostile = item.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
        if (closestHostile) {
            item.attack(closestHostile)
            return
        }
        
        const closestDamagedCreep = item.pos.findClosestByRange(FIND_MY_CREEPS, {
            filter: c => c.hits < c.hitsMax,
        })
        if (closestDamagedCreep) {
            item.heal(closestDamagedCreep)
            return
        }

        const closestDamagedStructure = item.pos.findClosestByRange(FIND_STRUCTURES, FIND_FILTERS.repair(item))
        if (closestDamagedStructure) {
            item.repair(closestDamagedStructure)
            return
        }
    }
}

module.exports.run = run