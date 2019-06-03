const lib = require('./lib')
const {
    bodyCost,
    spawnSay,
    FIND_FILTERS,
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
    userControl: require('./role.userControl').run,
    tombstoneCollector: require('./role.tombstoneCollector').run,
    claimer: require('./role.claimer').run,
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

        const harvesterCount = stateMachine.getRoleCount(spawn.name, 'harvester')
        const workerCount = stateMachine.getRoleCount(spawn.name, 'worker')
        const longHarvesterCount = stateMachine.getRoleCount(spawn.name, 'longHarvester')
        const carrierCount = stateMachine.getRoleCount(spawn.name, 'carrier')

        const workerBaseCount = 8

        // TODO: cache source info
        const sources = spawn.room.find(FIND_SOURCES)
        const harvesterShouldCount = sources.length * 2
        let workerShouldCount = workerBaseCount - harvesterCount
        // TODO: dont need too many carrier if not enough structure
        let carrierShouldCount = Math.max(0, harvesterCount - 1)

        let warriorShouldCount = 0

        let hostileCount = spawn.room.find(FIND_HOSTILE_CREEPS).length
        if (hostileCount > 0 &&
            spawn.room.find(FIND_MY_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_TOWER && s.energy > 0,
            }).length <= 0) {
            console.log('hostile creep in room, and no working tower')
            warriorShouldCount += hostileCount
        }
        // FIXME: if we cannot see the room ?
        const redFlag = _.filter(Game.flags, a => a.color === COLOR_RED)[0]
        if (redFlag && redFlag.room) {
            hostileCount = redFlag.room.find(FIND_HOSTILE_CREEPS).length
            if (hostileCount > 0) {
                const message = `hostile creep in other room, at ${Game.time}`
                console.log(message)
                Game.notify(message, 30)
                warriorShouldCount += 2 * hostileCount
            }
        }

        // TODO: store flag color other where ?
        const longHarvesterBaseCount = _.filter(Game.flags, a => a.color === COLOR_PURPLE)[0] ? 5 : 0
        // TODO: change number by total body parts
        let longHarvesterShouldCount = Math.max(0, longHarvesterBaseCount - (workerShouldCount - workerCount))

        let shouldUpgradeCreep =
            harvesterShouldCount +
            workerShouldCount +
            carrierShouldCount +
            longHarvesterShouldCount <=
            harvesterCount +
            workerCount +
            longHarvesterCount +
            carrierCount

        // if we haven't finished repairing, dont upgrade
        if (spawn.room.find(FIND_STRUCTURES, FIND_FILTERS.repair(spawn)).length > 0) {
            shouldUpgradeCreep = false
        }
        // if room contains creep need to renew, dont upgrade
        if (stateMachine.getStateCount(spawn.name, stateMachine.STATES.RENEW) > 0) {
            shouldUpgradeCreep = false
        }

        // console.log(`should upgrade creep ? ${shouldUpgradeCreep}`)

        // TODO: try re-order body parts, put MOVE and CARRY to back
        // TODO: use 5 WORK parts, one harvester per source
        // TODO: how to handle repair ?
        ensureCreep('harvester', harvesterShouldCount, [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE], false)
        ensureCreep('worker', workerShouldCount, [WORK, CARRY, MOVE], shouldUpgradeCreep)
        // TODO: change maxRepeat by room capasicity?
        ensureCreep('carrier', carrierShouldCount, [CARRY, CARRY, MOVE], true, 3)
        ensureCreep('longHarvester', longHarvesterShouldCount, [WORK, CARRY, MOVE, CARRY, MOVE], shouldUpgradeCreep, 4)
        ensureCreep('warrior', warriorShouldCount, [TOUGH, ATTACK, RANGED_ATTACK, MOVE, MOVE], false)

        const shouldSpawnClaimerOnLHBodyPartNumber = 13
        const shouldSpawnClaimer =
            stateMachine.getRoleCount(spawn.name, 'longHarvester') >= longHarvesterShouldCount &&
            // longHarvester must have more than 10 body parts in average
            utils.sumBy(_.filter(Game.creeps, c => lib.checkCreepRole(c, spawn, 'longHarvester')), c => c.body.length) >= longHarvesterShouldCount * shouldSpawnClaimerOnLHBodyPartNumber &&
            !_.find(Game.creeps, c => lib.checkCreepRole(c, spawn, 'claimer') && c.ticksToLive >= 100)
        if (shouldSpawnClaimer) {
            trySpawn('claimer', [CLAIM, MOVE])
        }

        if (spawn.room.find(FIND_TOMBSTONES, {
                // if tombstone is empty, stop spawning collector
                filter: t => t.creep.owner.username === 'Invader' && _.sum(t.store) > 0,
            })[0]) {

            // if (stateMachine.getRoleCount(spawn.name, 'tombstoneCollector') === 0) {
            //     Game.notify(`a invaders tombstone has occured, at ${Game.time}`, 60)
            // }

            // do not remove old tomb collectors if no tomb exists
            ensureCreep('tombstoneCollector', 1, [CARRY, MOVE], false)
            console.log('spawning tomb collector')
        }

        // allocate source
        if (harvesterCount !== harvesterShouldCount) {
            const assignedHarvester = Memory.assignedHarvester || {}
            Memory.assignedHarvester = assignedHarvester
            Memory.assignedHarvester[spawn.name] = false
        }
        if (harvesterCount === harvesterShouldCount && !Memory.assignedHarvester[spawn.name]) {
            const harvesters = _.filter(Game.creeps, c => lib.checkCreepRole(c, spawn, 'harvester'))
            for (let i = 0; i < harvesters.length; i += 1) {
                // TODO: move 2 into a const
                harvesters[i].memory.sourceTarget = sources[Math.floor(i / 2)].id
            }
            Memory.assignedHarvester[spawn.name] = true
        }

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
        throw new Error(`have error when executing ${(() => {
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
 * @param {number|null} maxRepeat max repeat time of a creep, if null or 0, means repeat any times
 * @param {{doNotKill: boolean|undefined}} options
 */
function ensureCreep(role, number, bodyUnit, repeat = true, maxRepeat = null, options = {}) {

    if (number < 0) {
        number = 0
    }

    const spawn = Game.spawns['Spawn1']

    // do not spawn or replace when spawning
    if (spawn.spawning) {
        return
    }

    const energy = spawn.room.energyAvailable
    /** @type {Creep[]} */
    const list = _.filter(Game.creeps, creep => creep.memory.role === role || creep.memory.oldRole === role)

    if (number === 0 && list.length === 0) {
        return
    }

    if (list.length < number) {

        let spawnMemory
        if (options.doNotKill) {
            spawnMemory = {
                doNotKill: true,
            }
        } else {
            spawnMemory = {}
        }

        if (repeat) {

            let body = bodyUnit
            let repeatCount = 1
            let newBody = bodyUnit
            do {
                body = newBody
                newBody = utils.repeatArray(bodyUnit, ++repeatCount)
            } while (bodyCost(newBody) <= energy && (!maxRepeat || repeatCount <= maxRepeat))
            // biggest repeat of body

            trySpawn(role, body, spawnMemory)

        } else {
            trySpawn(role, bodyUnit, spawnMemory)
        }

    } else {

        if (_.any(list, a => a.memory.toDie || a.memory.doNotKill)) {
            // already about to kill it or dont want to kill it, skip
            // TODO: what if only one creep dont want to kill while other creeps with same role are killable ?
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
            for (let i = 0; i < list.length - number; ++i) {
                // TODO: set dying strategy in state machine's arrange, rather than changing roles
                dieList[i].memory.oldRole = role
                dieList[i].memory.role = 'toDie'
            }

        } else { // length == number

            if (!repeat) {
                return
            }

            const oldBodyRepeat = Math.floor(dieList[0].body.length / bodyUnit.length)

            // TODO: reuse the code beyond
            let body = null
            let newBody = null
            let repeatCount = oldBodyRepeat - 1
            do {
                body = newBody
                newBody = utils.repeatArray(bodyUnit, ++repeatCount)
            } while (bodyCost(newBody) <= energy && (!maxRepeat || repeatCount <= maxRepeat))

            repeatCount -= 1 // repeat count is bigger by 1
            // console.log(`repeat count ${repeatCount}, oldBodyRepeat ${oldBodyRepeat}`)
            if (repeatCount <= oldBodyRepeat) {
                // cannot spawn bigger one
                return
            }

            // kill smallest creep to spawn a bigger one
            const message = `kill ${dieList[0].name} to make a better one, old body parts: ${_.map(dieList[0].body, 'type')}, new body parts: ${body}, role: ${role}, at ${Game.time}`
            Game.notify(message, 60)
            console.log(message)
            dieList[0].memory.oldRole = role
            dieList[0].memory.role = 'toDie'
            trySpawn(role, body)
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