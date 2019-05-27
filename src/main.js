const {
    bodyCost,
    spawnSay,
} = require('./lib')

const utils = require('./utils')

var roleHarvester = require('./role.harvester')
var roleUpgrader = require('./role.upgrader')
var roleBuilder = require('./role.builder')

const roleWorker = require('./role.worker')
const roleWarrior = require('./role.warrior')
const roleLongHarvester = require('./role.longHarvester')

const runTower = require('./run.tower')

const roleToFunc = {
    harvester: roleHarvester.run,
    upgrader: roleUpgrader.run,
    builder: roleBuilder.run,
    worker: roleWorker.run,
    warrior: roleWarrior.run,
    longHarvester: roleLongHarvester.run,
}

module.exports.loop = function () {

    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name]
            console.log('Clearing non-existing creep memory:', name)
        }
    }

    //ensureCreep('upgrader', 1)
    ensureCreep('harvester', 5, [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE])
    ensureWorker(6)
    if (Game.spawns['Spawn1'].room.find(FIND_HOSTILE_CREEPS).length > 0) {
        console.log('hostile creep in room')
        ensureCreep('warrior', 1, [TOUGH, ATTACK, ATTACK, MOVE, MOVE])
    }
    ensureCreep('longHarvester', 5)

    const errors = []
    for (let name in Game.creeps) {
        var creep = Game.creeps[name]

        const func = roleToFunc[creep.memory.role]
        if (func) {
            try {
                func(creep)
            } catch (err) {
                errors.push(err)
            }
        } else {
            errors.push(new Error(`undefined role ${creep.memory.role}`))
        }
    }

    try {
        runTower.run()
    } catch (err) {
        errors.push(err)
    }

    if (errors.length > 0) {
        throw new Error(`have error when executing ${(()=>{
            let str = ''
            for (let err of errors) {
                str += '\n' + err.message + '\n' + err.stack
            }
            return str
        })()}`)
    }
}

const WORKER_SPAWN_ORDER = [
    // [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE],
    [],
]

const PRE_ALLOCATED_ENERGY = 0

function ensureWorker(number) {


    const roleName = 'worker'
    var list = _.filter(Game.creeps, (creep) => creep.memory.role == roleName)

    if (list.length < number) {

        const energy = Game.spawns['Spawn1'].room.energyAvailable - PRE_ALLOCATED_ENERGY

        // non custom body layout
        const partEnergy = BODYPART_COST.carry + BODYPART_COST.move + BODYPART_COST.work
        const partUnitNumber = Math.floor(energy / partEnergy)
        const nonCustomBody = []
        for (let i = 0; i < partUnitNumber; ++i) {
            nonCustomBody.push(WORK)
            nonCustomBody.push(MOVE)
            nonCustomBody.push(CARRY)
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
        spawnSay(Game.spawns['Spawn1'], '🛠️' + spawning.name)
    }
}

function ensureCreep(role, number, body = null) {

    const spawn = Game.spawns['Spawn1']

    const list = _.filter(Game.creeps, creep => creep.memory.role === role && !creep.memory.toDie)

    if (list.length < number) {

        const energy = spawn.room.energyAvailable - PRE_ALLOCATED_ENERGY

        if (!body) {
            // non custom body layout
            const partEnergy = BODYPART_COST.carry + BODYPART_COST.move + BODYPART_COST.work
            const partUnitNumber = Math.floor(energy / partEnergy)
            const nonCustomBody = []
            for (let i = 0; i < partUnitNumber; ++i) {
                nonCustomBody.push(WORK)
                nonCustomBody.push(MOVE)
                nonCustomBody.push(CARRY)
            }

            body = nonCustomBody

        } else {

            let repeat = 1
            const bodyUnit = body
            let newBody = body
            do {
                body = newBody
                newBody = utils.repeatArray(bodyUnit, ++repeat)
            } while (bodyCost(newBody) <= energy)
            // biggest repeat of body
        }

        trySpawn(role, body)

    } else if (list.length > number) {
        console.log(`too much ${role}, trying to reduce. expect: ${number}, now: ${list.length}`)
        const dieList = list.sort((a, b) => bodyCost(a) - bodyCost(b))
        for (let i = 0; i <= list.length - number; ++i) {
            dieList[i].memory.toDie = true
        }
    }
}

function trySpawn(role, parts) {
    const newName = role + Game.time
    return Game.spawns['Spawn1'].spawnCreep(parts, newName, {
        memory: {
            role: role,
            spawn: 'Spawn1',
        },
    })
}