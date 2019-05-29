const lib = require('./lib')
const {
    bodyCost,
    spawnSay,
} = lib

const utils = require('./utils')

const stateMachine = require('./stateMachine')

const runTower = require('./run.tower')

const roleToFunc = {
    harvester: require('./role.harvester').run,
    upgrader: require('./role.upgrader').run,
    builder: require('./role.builder').run,
    worker: require('./role.worker').run,
    warrior: require('./role.warrior').run,
    longHarvester: require('./role.longHarvester').run,
    carrier: require('./role.carrier').run,
    toDie: require('./role.toDie').run,
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
        stateMachine.global()
    } catch (err) {
        errors.push(err)
    }

    try {

        const spawn = Game.spawns['Spawn1']

        // ensureCreep('upgrader', 1)
        ensureCreep('builder', 0, [WORK, CARRY, MOVE])

        // TODO: multiple room
        // TODO: assign creep to source
        // const harvesterCount = _.reduce(
        //     Game.spawns['Spawn1'].room.find(FIND_SOURCES),
        //     (sum, curr) => sum + lib.findAdjcentPassableAreaNumber(curr),
        //     0)

        /*
        source: 3000 
        take 300 tick to regenerate
        a WORK take 2 per tick
        2 harvester = 8 worker = 16 energy per tick
        drying source take about 186 tick

        only need 2 harvester per source
        */

        // TODO: if i can set the target of a harvester, then dont need '+1'
        const harvesterCount = Game.spawns['Spawn1'].room.find(FIND_SOURCES).length * 2 + 1
        ensureCreep('harvester', harvesterCount, [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE], false)

        let workerCount = 4
        ensureCreep('worker', workerCount, [WORK, CARRY, MOVE])

        let carrierCount = stateMachine.getRoleCount(spawn.room.name, 'harvester') + 1
        ensureCreep('carrier', carrierCount, [CARRY, CARRY, MOVE])

        let warriorCount = 0
        if (spawn.room.find(FIND_HOSTILE_CREEPS).length > 0) {
            console.log('hostile creep in room')
            warriorCount += 1
        }
        // FIXME: if we cannot see the room ?
        if (Game.rooms['E23N23'] && Game.rooms['E23N23'].find(FIND_HOSTILE_CREEPS).length > 0) {
            warriorCount += 1
        }
        ensureCreep('warrior', warriorCount, [TOUGH, ATTACK, ATTACK, MOVE, MOVE], false)

        // TODO: change number by total body parts
        let longHarvesterCount = 5 - (workerCount - stateMachine.getRoleCount(spawn.room.name, 'worker'))
        ensureCreep('longHarvester', longHarvesterCount, [WORK, CARRY, MOVE])

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
    /** @type {Creep[]} */
    const list = _.filter(Game.creeps, creep => creep.memory.role === role || creep.memory.oldRole === role)

    if (number === 0 && list.length === 0) {
        return
    }

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

        if (_.any(list, a => a.memory.toDie)) {
            // already about to kill it, skip
            return
        }

        const costFunc = (c) => bodyCost(_.map(c.body, a => a.type))

        const dieList = list.sort((a, b) => {
            const aC = costFunc(a)
            const bC = costFunc(b)
            if (aC - bC === 0) {
                return a.ticksToLive - b.ticksToLive
            } else {
                return aC - bC
            }
        })
        // console.log(JSON.stringify(_.map(dieList, a => bodyCost(_.map(a.body, b => b.type)))))

        if (list.length > number) {
            console.log(`too much ${role}, trying to reduce. expect: ${number}, now: ${list.length}`)
            for (let i = 0; i <= list.length - number; ++i) {
                // TODO: set dying strategy in state machine's arrange, rather than changing roles
                dieList[i].memory.oldRole = role
                dieList[i].memory.role = 'toDie'
            }

            // length == number
        } else {

            const oldBody = _.map(dieList[0].body, 'type')
            const newBody = oldBody.concat(...bodyUnit)
            if (repeat && energy >= bodyCost(newBody)) {
                // kill smallest creep to spawn a bigger one
                console.log(`kill ${dieList[0].name} to make a better one, old body parts: ${oldBody}, new body parts: ${newBody}`)
                dieList[0].memory.oldRole = role
                dieList[0].memory.role = 'toDie'
                trySpawn(role, newBody)
            }
        }
    }
}

function trySpawn(role, body, memory = {}) {

    const spawn = Game.spawns['Spawn1']

    if (spawn.spawning) {
        return ERR_BUSY
    }
    if (bodyCost(body) > spawn.room.energyAvailable) {
        spawnSay(spawn, `⚠ NO ENOUGH ENERGY: ${role}`)
        return ERR_NOT_ENOUGH_ENERGY
    }

    const newName = role + Game.time
    const result = spawn.spawnCreep(body, newName, {
        memory: _.assign({
            role: role,
            spawn: spawn.name,
        }, memory),
    })
    console.log(`trying to spawn ${role} with body [${body}], result: ${result}`)
    return result
}