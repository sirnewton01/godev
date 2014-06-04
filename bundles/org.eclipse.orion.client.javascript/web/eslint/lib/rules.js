/* global module require exports define */
(function(root, factory) {
    if(typeof exports === 'object') {
        module.exports = factory(require('./load-rules'), require, exports, module);
    }
    else if(typeof define === 'function' && define.amd) {
        define(['./load-rules-async', 'require', 'exports', 'module'], factory);
    }
    else {
        var req = function(id) {return root[id];},
            exp = root,
            mod = {exports: exp};
        root.rules = factory(root.loadRules, req, exp, mod);
    }
}(this, function(loadRules, require, exports, module) {
/**
 * @fileoverview Main CLI object.
 * @author Nicholas C. Zakas
 */
"use strict";

//------------------------------------------------------------------------------
// Privates
//------------------------------------------------------------------------------

var rules = Object.create(null);

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------
function define(ruleId, ruleModule) {
    rules[ruleId] = ruleModule;
}

function load(rulesDir) {
    var newRules = loadRules(rulesDir);
    Object.keys(newRules).forEach(function(ruleId) {
        define(ruleId, newRules[ruleId]);
    });
}
exports.load = load;

exports.get = function(ruleId) {
    return rules[ruleId];
};

exports.testClear = function() {
    rules = Object.create(null);
};

exports.define = define;

//------------------------------------------------------------------------------
// Initialization
//------------------------------------------------------------------------------

// loads built-in rules
load();

    return exports;
}));
