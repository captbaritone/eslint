/**
 * @fileoverview Common helpers for operations on filenames and paths
 * @author Ian VanSchooten
 * @copyright 2016 Ian VanSchooten. All rights reserved.
 * See LICENSE in root directory for full license.
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var path = require("path"),
    debug = require("debug");
debug = debug("eslint:path-util");



/**
 * Replace Windows with Unix style paths and remove ./ prefix
 * @param {string} filepath Path to normalize
 * @returns {string} Normalized filepath
 */
function normalizeFilepath(filepath) {
    filepath = filepath.replace(/\\/g, "/");
    filepath = filepath.replace(/^\.\//, "");
    return filepath;
}

/**
 * Resolves an absolute filepath to a relative path from a given base bath
 *
 * For example, if the filepath is `/my/awesome/project/foo.bar`,
 * and the base directory is `/my/awesome/project/`,
 * then this function should return `foo.bar`.
 *
 * It does not take into account symlinks (for now).
 *
 * @param {string} filepath Absolute path to resolve
 * @param {string} [baseDir] Absolute base directory to resolve the filepath from.
 *                           If not provided, all this function will do is remove
 *                           a leading slash.
 * @returns {string} Resolved filepath
 */
function resolveFilepath(filepath, baseDir) {
    var relativePath;
    if (!path.isAbsolute(filepath)) {
        throw new Error("filepath should be an absolute path");
    }
    if (baseDir) {
        if (!path.isAbsolute(baseDir)) {
            throw new Error("baseDir should be an absolute path");
        }
        relativePath = path.relative(baseDir, filepath);
    } else {
        relativePath = filepath.replace(/^\//, "");
    }
    return relativePath;
}

module.exports = {
    normalizeFilepath: normalizeFilepath,
    resolveFilepath: resolveFilepath
};
