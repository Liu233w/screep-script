const {
    FIND_FILTERS
} = require('lib')

function run() {

    for (let name in Game.structures) {
        const item = Game.structures[name]
        if (item.structureType !== STRUCTURE_TOWER) {
            continue
        }

        const closestDamagedStructure = item.pos.findClosestByRange(FIND_STRUCTURES, FIND_FILTERS.repair(item));
        if (closestDamagedStructure) {
            item.repair(closestDamagedStructure);
        }

        const closestHostile = item.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (closestHostile) {
            item.attack(closestHostile);
        }
    }
}

module.exports.run = run