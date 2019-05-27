module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-screeps')

    grunt.initConfig({
        screeps: {
            options: {
                email: 'wwwlsmcom@outlook.com',
                password: 'x9bY0HzAFTBr',
                branch: 'default',
                ptr: false,
            },
            dist: {
                src: ['src/*.js'],
            },
        },
    })
}
