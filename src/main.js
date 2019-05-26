var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');

const roleWorker = require('role.worker')
const roleWarrior = require('role.warrior')

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
    ensureWorker(8)
    ensureCreep('warrior', 1, [TOUGH, ATTACK, ATTACK, MOVE, MOVE])

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
        if (creep.memory.role === 'warrior') {
            roleWarrior.run(creep)
        }
    }
}

function bodyCost(body) {
    return body.reduce(function (cost, part) {
        return cost + BODYPART_COST[part];
    }, 0);
}

const WORKER_SPAWN_ORDER = [
    [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE],
    [CARRY, WORK, MOVE, CARRY, WORK, MOVE],
    [WORK, CARRY, MOVE],
]

function ensureWorker(number) {

    const PRE_ALLOCATED_ENERGY = 0

    const roleName = 'worker'
    var list = _.filter(Game.creeps, (creep) => creep.memory.role == roleName);

    if (list.length < number) {
        for (let body of WORKER_SPAWN_ORDER) {
            if (bodyCost(body) + PRE_ALLOCATED_ENERGY <= Game.spawns['Spawn1'].room.energyAvailable) {
                trySpawn(roleName, body)
                break
            }
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

function ensureCreep(role, number, body = [WORK, CARRY, MOVE]) {

    var list = _.filter(Game.creeps, (creep) => creep.memory.role == role);

    if (list.length < number) {
        trySpawn(role, body)
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