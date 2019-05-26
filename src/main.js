var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');

const roleWorker = require('role.worker')
const roleWarrior = require('role.warrior')
const roleLongHarvester = require('role.longHarvester')

const roleToFunc = {
    harvester: roleHarvester.run,
    upgrader: roleUpgrader.run,
    builder: roleBuilder.run,
    worker: roleWorker.run,
    warrior: roleWarrior.run,
    longHarvester: roleLongHarvester.run,
}

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
    ensureCreep('longHarvester', 1, [WORK, CARRY, MOVE, WORK, CARRY, MOVE])

    let haveError = false
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];

        const func = roleToFunc[creep.memory.role]
        if (func) {
            try {
                func(creep)
            } catch (err) {
                haveError = true
                logError(err)
            }
        } else {
            haveError = true
            logError(new Error(`undefined role ${creep.memory.role}`))
        }
    }

    if (haveError) {
        throw new Error('have error when executing')
    }
}

function logError(err) {
    console.log(err.message, err.stack)
}

function bodyCost(body) {
    return body.reduce(function (cost, part) {
        return cost + BODYPART_COST[part];
    }, 0);
}

const WORKER_SPAWN_ORDER = [
    [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE],
]

function ensureWorker(number) {

    const PRE_ALLOCATED_ENERGY = 0

    const roleName = 'worker'
    var list = _.filter(Game.creeps, (creep) => creep.memory.role == roleName);

    if (list.length < number) {

        const energy = Game.spawns['Spawn1'].room.energyAvailable - PRE_ALLOCATED_ENERGY

        // non custom body layout
        const partEnergy = BODYPART_COST.carry + BODYPART_COST.move + BODYPART_COST.work
        const partUnitNumber = Math.floor(energy / partEnergy)
        const nonCustomBody = []
        for (let i = 0; i < partUnitNumber; ++i) {
            nonCustomBody.push(WORK)
            nonCustomBody.push(CARRY)
            nonCustomBody.push(MOVE)
        }

        // if non custom body is bigger, use it
        if (bodyCost(nonCustomBody) > bodyCost(WORKER_SPAWN_ORDER[0])) {
            trySpawn(roleName, nonCustomBody)
            return
        }

        for (let body of WORKER_SPAWN_ORDER) {
            if (bodyCost(body) <= energy) {
                trySpawn(roleName, body)
                return
            }
        }

        trySpawn(roleName, nonCustomBody)
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