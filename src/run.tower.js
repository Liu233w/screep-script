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

        let closestHostile = item.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
            filter: c => _.any(c.body, b => b.type === HEAL),
        })
        if (!closestHostile) {
            closestHostile = item.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
        }
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

        const damagedStructures = item.room.find(FIND_STRUCTURES, FIND_FILTERS.repair(item))
        const repairOrder = _.sortBy(damagedStructures, s => s.hits)
        //const closestDamagedStructure = item.pos.findClosestByRange(FIND_STRUCTURES, FIND_FILTERS.repair(item))
        if (repairOrder[0]) {
            item.repair(repairOrder[0])
            return
        }
    }
}

module.exports.run = run