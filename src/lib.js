module.exports = {
    /**
     * 
     * @param {Creep} creep 
     * @param {Funtion} callBack 
     */
    moveToSpawnAndThen: function (creep, callBack) {
        const mySpawn = creep.room.find(FIND_MY_SPAWNS)[0]
        if (mySpawn) {
            if (!creep.pos.inRangeTo(mySpawn, SPAWN_RENEW_RATIO)) {
                moveTo(creep, mySpawn, "#00ff00")
            } else {
                if (callBack) {
                    callBack(mySpawn)
                }
            }
        } else {
            console.info('cannot find a spawn, by ', creep.name)
        }
    },
}