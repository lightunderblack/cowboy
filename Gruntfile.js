module.exports = function( grunt ) {
    grunt.initConfig( {
        pkg: grunt.file.readJSON( "package.json" ),

        uglify: {
            options: {
              banner: "/*! <%= pkg.name %> <%= grunt.template.today(\"yyyy-mm-dd\") %> */\n"
            },
            build: {
              src: "src/<%= pkg.name %>.js",
              dest: "build/<%= pkg.name %>.min.js"
            }
        },

        jshint: {
            options: {
                jshintrc: ".jshintrc"
            },
            plugin: {
                src: "assets/js/plugin/**/*.js"
            }
        },

        karma: {
            options: {
                runnerPort: 9999,
                configFile: "karma.conf.js"
            },
            unit: {
                singleRun: true,
                autoWatch: false,
                logLevel: "ERROR"
            }
        },

        watch: {
            jshint: {
                tasks: [ "jshint" ],
                files: "assets/js/plugin/**/*.js"
            }
        }
    } );

    grunt.loadNpmTasks( "grunt-karma" );
    grunt.loadNpmTasks( "grunt-contrib-jshint" );
    grunt.loadNpmTasks( "grunt-contrib-uglify" );
    grunt.loadNpmTasks( "grunt-contrib-watch" );

    grunt.registerTask( "default", [ "jshint", "karma" ] );
};
