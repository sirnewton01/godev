/*global module require*/
/*jslint regexp:false*/
var path = require('path');

module.exports = function(grunt) {
    function mixin(target/*, source..*/) {
        Array.prototype.forEach.call(arguments, function(source) {
            Object.keys(source).forEach(function(key) {
                target[key] = source[key];
            });
        });
        return target;
    }

    var umdConfigs = {};
    mixin(umdConfigs, {
        // ********************************************************
        // JSON
        // ********************************************************
        // RequireJS cannot load .json files as JS objects, so let's UMDifiy it as `environments.js`
        'conf/environments.js': {
            src: '<%= src %>/conf/environments.json',
            dest: '<%= dest %>/conf/environments.js',
            globalAlias: 'conf.environments',
            objectToExport: 'module.exports',
            template: 'unit'
        },
        // ********************************************************
        // JS
        // ********************************************************
        'lib/eslint.js': {
            src: '<%= src %>/lib/eslint.js',
            dest: '<%= dest %>/lib/eslint.js',
            deps: {
                amd: 'esprima estraverse escope eslint/conf/environments ./rules ./util ./rule-context ./events'.split(/\s+/),
                cjs: 'esprima estraverse escope ../conf/environments     ./rules ./util ./rule-context events'.split(/\s+/),
                'default': 'esprima estraverse escope environments rules util RuleContext events'.split(/\s+/)
            },
            globalAlias: 'eslint',
            objectToExport: 'module.exports',
            template: 'unit'
        },
        'lib/rule-context.js': {
            src: '<%= src %>/lib/rule-context.js',
            dest: '<%= dest %>/lib/rule-context.js',
            deps: {},
            globalAlias: 'ruleContext',
            objectToExport: 'module.exports',
            template: 'unit'
        },
        'lib/load-rules.js': {
            src: '<%= src %>/lib/load-rules.js',
            dest: '<%= dest %>/lib/load-rules.js',
            deps: {},
            globalAlias: 'loadRules',
            objectToExport: 'module.exports',
            template: 'unit'
        },
        'lib/rules.js': {
            src: '<%= src %>/lib/rules.js',
            dest: '<%= dest %>/lib/rules.js',
            deps: {
                amd: ['./load-rules-async'], // Swap in our AMD rule loader
                cjs: ['./load-rules'],
                'default': ['loadRules']
            },
            globalAlias: 'rules',
            objectToExport: 'exports',
            template: 'unit'
        },
        'lib/util.js': {
            src: '<%= src %>/lib/util.js',
            dest: '<%= dest %>/lib/util.js',
            deps: {},
            globalAlias: 'util',
            objectToExport: 'module.exports',
            template: 'unit'
        }
    });
    // ********************************************************
    // RULES
    // ********************************************************
    // Our rules are already UMD so this is unnecessary
//    mixin(umdConfigs, (function() {
//        var c = {}, mappings = grunt.file.expandMapping('<%= src %>/lib/rules/*.js', dest);
//        mappings.forEach(function(mapping) {
//            var noext = path.basename(mapping.src, path.extname(mapping.src));
//            var bogusname = noext.replace(/[^A-Za-z0-9$_]/g, '');
//            c[mapping.src] = {
//                src: mapping.src,
//                dest: mapping.dest,
//                deps: {},
//                globalAlias: 'rules.' + bogusname,
//                objectToExport: 'module.exports',
//                template: 'unit'
//            };
//        });
//        return c;
//    }()));

    grunt.initConfig({
        src: "./",
        dest: "./umd",

        umd: umdConfigs,
        copy: {
            tests: {
                files: [{
                    expand: true,
                    cwd: '<%= src %>',
                    src: 'tests/**',
                    dest: '<%= dest %>/'
                }]
            },
            // Copy back the UMD'd files from umd/ into eslint/
            overwrite: {
                files: [
                    {
                        expand: true,
                        cwd: '<%= dest %>',
                        src: 'conf/*',
                        dest: '<%= src %>/'
                    },{
                        expand: true,
                        cwd: '<%= dest %>',
                        src: 'lib/**',
                        dest: '<%= src %>/'
                    }
                ]
            }
        },
        'string-replace': {
            // Prepend json blob with "module.exports = " to produce a valid module
            json: {
                files: {
                   '<%= dest %>/conf/environments.js': '<%= dest %>/conf/environments.js'
                },
                options: {
                    replacements: [{
                        pattern: /(function\(require, exports, module\) \{(\s*))\{/,
                        replacement: '$1module.exports = {'
                    }]
                }
            },
            // Blow away/rewrite some require()s to make eslint.js work under AMD and Node
            eslint: {
                files: {
                    '<%= dest %>/lib/eslint.js': '<%= dest %>/lib/eslint.js'
                },
                options: {
                    replacements: [{
                        pattern: /(var esprima[^;]+;)/,
                        replacement: '/*\n$1\n*/\nvar EventEmitter = events.EventEmitter;'
                    }]
                }
            },
            // Similar fix for rules.js, so it uses the rule-loader that RequireJS gives it.
            rules: {
                files: {
                    '<%= dest %>/lib/rules.js': '<%= dest %>/lib/rules.js'
                },
                options: {
                    replacements: [{
                        pattern: 'loadRules = require("./load-rules")',
                        replacement: '_ = null'
                    }]
                }
            }
        },
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-string-replace');
    grunt.loadNpmTasks('grunt-umd');

    grunt.registerTask('default', ['umd', 'copy:tests', 'string-replace']);
    grunt.registerTask('overwrite', ['default', 'copy:overwrite']);
};
