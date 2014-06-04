/* global require exports define module process __dirname */
(function(root, factory) {
    if(typeof exports === 'object') {
        module.exports = factory(require, exports, module);
    }
    else if(typeof define === 'function' && define.amd) {
        define(['require', 'exports', 'module'], factory);
    }
    else {
        var req = function(id) {return root[id];},
            exp = root,
            mod = {exports: exp};
        root.loadRules = factory(req, exp, mod);
    }
}(this, function(require, exports, module) {
"use strict";

var fs = require("fs"),
    path = require("path");

module.exports = function(rulesDir) {
    if (!rulesDir) {
        rulesDir = path.join(__dirname, "rules");
    } else {
        rulesDir = path.resolve(process.cwd(), rulesDir);
    }

    var rules = Object.create(null);
    fs.readdirSync(rulesDir).forEach(function(file) {
        if (path.extname(file) !== ".js") { return; }
        rules[file.slice(0, -3)] = require(path.join(rulesDir, file));
    });
    return rules;
};
    return module.exports;
}));
