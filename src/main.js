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

    const errors = []

    for (let name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name]
            console.log('Clearing non-existing creep memory:', name)
        }
    }

    try {
        //ensureCreep('upgrader', 1)
        ensureCreep('harvester', 5, [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE])
        ensureCreep('worker', 6, [WORK, CARRY, MOVE])
        if (Game.spawns['Spawn1'].room.find(FIND_HOSTILE_CREEPS).length > 0) {
            console.log('hostile creep in room')
            ensureCreep('warrior', 1, [TOUGH, ATTACK, ATTACK, MOVE, MOVE], false)
        }
        ensureCreep('longHarvester', 6, [WORK, CARRY, MOVE])

    } catch (err) {
        errors.push(err)
    }

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

    const spawning = Game.spawns['Spawn1'].spawning
    if (spawning) {
        spawnSay(Game.spawns['Spawn1'], '🛠️' + spawning.name)
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

/**
 * 
 * @param {string} role 
 * @param {number} number 
 * @param {string[]} bodyUnit 
 * @param {boolean} repeat can body be repeated to build a larger one
 */
function ensureCreep(role, number, bodyUnit, repeat = true) {

    const spawn = Game.spawns['Spawn1']
    const energy = spawn.room.energyAvailable
    const list = _.filter(Game.creeps, creep => creep.memory.role === role && !creep.memory.toDie)

    if (list.length < number) {

        if (repeat) {

            let body = bodyUnit
            let repeat = 1
            let newBody = bodyUnit
            do {
                body = newBody
                newBody = utils.repeatArray(bodyUnit, ++repeat)
            } while (bodyCost(newBody) <= energy)
            // biggest repeat of body

            trySpawn(role, body)

        } else {
            trySpawn(role, bodyUnit)
        }

    } else {

        const dieList = list.sort((a, b) => bodyCost(a) - bodyCost(b))

        if (list.length > number) {
            console.log(`too much ${role}, trying to reduce. expect: ${number}, now: ${list.length}`)
            for (let i = 0; i <= list.length - number; ++i) {
                dieList[i].memory.toDie = true
            }

            // length == number
        } else if (repeat && energy >= dieList[0].body.concat(bodyUnit)) {
            // kill smallest creep to spawn a bigger one
            console.log(`kill ${dieList[0].name} to make a better one, old bodyCost: ${bodyCost(dieList[0].body)}`)
            dieList[0].memory.toDie = true
        }
    }
}

function trySpawn(role, body) {

    const spawn = Game.spawns['Spawn1']

    if (spawn.spawning) {
        return ERR_BUSY
    }
    if (bodyCost(body) > spawn.room.energyAvailable) {
        spawnSay(spawn, `⚠ NOT ENOUGH ENERGY: ${role}`)
        return ERR_NOT_ENOUGH_ENERGY
    }

    const newName = role + Game.time
    const result = spawn.spawnCreep(body, newName, {
        memory: {
            role: role,
            spawn: spawn.name,
        },
    })
    console.log(`trying to spawn creep with body [${body}], result: ${result}`)
    return result
}