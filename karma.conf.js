// Karma configuration
// Generated on Wed Apr 27 2016 23:27:12 GMT+0800 (中国标准时间)

module.exports = function( config ) {
  config.set( {

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: "",

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: [ "jasmine" ],

    // list of files / patterns to load in the browser
    files: [
        {
            pattern: "view/**/*.html",
            watched: true,
            included: false,
            served: true
        },
        "assets/js/lib/jquery/jquery.js",
        "assets/js/lib/jasmine-jquery/lib/jasmine-jquery.js",
        "assets/js/lib/jasmine-ajax/lib/mock-ajax.js",
        "assets/js/plugin/jquery-version.js",
        "assets/js/plugin/jquery-plugin.js",
        "assets/js/plugin/**/*.js",
        "test/**/*.js"
    ],

    // list of files to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: [ "progress" ],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: [ "Chrome", "PhantomJS" ],

    phantomjsLauncher: {
        // configure PhantomJS executable for each platform 
        cmd: {
            win32: "D:/PhantomJS-2.1.1/bin/phantomjs.exe"
        }
    },    

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  } );
};
