/**
 * @fileoverview Expose out ESLint and CLI to require.
 * @author Ian Christian Myers
 */

"use strict";
/* global module require */
module.exports = {
    linter: require("./eslint"),
    cli: require("./cli")
};