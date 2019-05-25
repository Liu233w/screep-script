var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');

const roleWorker = require('role.worker')

module.exports.loop = function () {

    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            if (Memory.creeps[name].rule === 'worker') {
                roleWorker.destruct(Memory.creeps[name])
            }
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }

    //ensureCreep('upgrader', 1)
    //ensureCreep('harvester', 1)
    ensureCreep('worker', 6)

    const workers = _.filter(Game.creeps, a => a.memory.role === 'worker')
    roleWorker.beforeAll(workers)

    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        if (creep.memory.role == 'harvester') {
            roleHarvester.run(creep);
        }
        if (creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        }
        if (creep.memory.role == 'builder') {
            roleBuilder.run(creep);
        }
        if (creep.memory.role === 'worker') {
            roleWorker.run(creep)
        }
    }
}

function ensureCreep(role, number) {
    var list = _.filter(Game.creeps, (creep) => creep.memory.role == role);

    if (list.length < number) {
        let result = trySpawn(role, [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE])
        if (result === ERR_NOT_ENOUGH_ENERGY) {
            result = trySpawn(role, [WORK, CARRY, MOVE])
        }
    }

    const spawning = Game.spawns['Spawn1'].spawning
    if (spawning) {
        Game.spawns['Spawn1'].room.visual.text(
            '🛠️' + spawning.name,
            Game.spawns['Spawn1'].pos.x + 1,
            Game.spawns['Spawn1'].pos.y, {
                align: 'left',
                opacity: 0.8
            });
    }
}

function trySpawn(role, parts) {
    const newName = role + Game.time
    return Game.spawns['Spawn1'].spawnCreep(parts, newName, {
        memory: {
            role: role
        }
    })
}