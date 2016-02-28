/**
 * @fileoverview Tests for IgnoredPaths object.
 * @author Jonathan Rajavuori
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var assert = require("chai").assert,
    path = require("path"),
    os = require("os"),
    IgnoredPaths = require("../../lib/ignored-paths.js"),
    sinon = require("sinon"),
    fs = require("fs");

require("shelljs/global");

/* global mkdir, rm, cp */

//------------------------------------------------------------------------------
// Helper
//------------------------------------------------------------------------------

var fixtureDir;

/**
 * get raw rules from IgnorePaths instance
 * @param {IgnoredPaths} ignoredPaths, instance of IgnoredPaths
 * @returns {string[]} raw ignore rules
 */
function getIgnoreRules(ignoredPaths) {
    var ignoreRulesProperty = "_rules";
    var ignoreRules = [];

    Object.keys(ignoredPaths.ig).forEach(function(key) {
        ignoreRules = ignoreRules.concat(ignoredPaths.ig[key][ignoreRulesProperty]);
    });

    return ignoreRules;
}

/**
 * Get a list of paths of loaded ignore files (e.g. .eslintignore) from IgnorePaths instance
 * @param {IgnoredPaths} ignoredPaths, instance of IgnoredPaths
 * @returns {string[]} loaded ignore files
 */
function getIgnoreFiles(ignoredPaths) {
    return ignoredPaths.ig.custom._ignoreFiles; // eslint-disable-line no-underscore-dangle
}

/**
 * count the number of default patterns applied to IgnoredPaths instance
 * @param {IgnoredPaths} ignoredPaths, instance of IgnoredPaths
 * @returns {integer} count of default patterns
 */
function countDefaultPatterns(ignoredPaths) {
    var count = ignoredPaths.defaultPatterns.length;
    if (!ignoredPaths.options || (ignoredPaths.options.dotfiles !== true)) {
        count++;
    }
    return count;
}

/**
 * Returns the path inside of the fixture directory.
 * @returns {string} The path inside the fixture directory.
 * @private
 */
function getFixturePath() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(fs.realpathSync(fixtureDir));
    return path.join.apply(path, args);
}

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("IgnoredPaths", function() {

    // copy into clean area so as not to get "infected" by this project's .eslintrc files
    before(function() {
        fixtureDir = path.join(os.tmpdir(), "/eslint/fixtures/ignored-paths/");
        mkdir("-p", fixtureDir);
        cp("-r", "./tests/fixtures/ignored-paths/.", fixtureDir);
    });

    after(function() {
        rm("-r", fixtureDir);
    });

    describe("initialization", function() {

        it("should load .eslintignore from cwd when explicitly passed", function() {
            var expectedIgnoreFile = getFixturePath(".eslintignore");
            var ignoredPaths = new IgnoredPaths({ ignore: true, cwd: getFixturePath() });

            assert.isNotNull(ignoredPaths.baseDir);
            assert.equal(getIgnoreFiles(ignoredPaths), expectedIgnoreFile);
        });

        it("should not travel to parent directories to find .eslintignore when it's missing and cwd is provided", function() {
            var cwd, ignoredPaths;

            cwd = path.resolve(__dirname, "..", "fixtures", "configurations");

            ignoredPaths = new IgnoredPaths({ ignore: true, cwd: cwd });
            assert.ok(getIgnoreRules(ignoredPaths).length === 3);

            assert.equal(getIgnoreRules(ignoredPaths).filter(function(rule) {
                return rule.pattern === "/node_modules/";
            }).length, 1);

            assert.equal(getIgnoreRules(ignoredPaths).filter(function(rule) {
                return rule.pattern === "/bower_components/";
            }).length, 1);

        });

        it("should load empty array with ignorePath set to false", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, cwd: getFixturePath("no-ignore-file") });
            assert.isArray(getIgnoreRules(ignoredPaths));
            assert.lengthOf(getIgnoreRules(ignoredPaths), countDefaultPatterns(ignoredPaths));
        });

        it("should accept an array for options.ignorePattern", function() {
            var ignorePattern = ["a", "b"];

            var ignoredPaths = new IgnoredPaths({
                ignorePattern: ignorePattern
            });

            assert.ok(ignorePattern.every(function(pattern) {
                return getIgnoreRules(ignoredPaths).filter(function(rule) {
                    return (rule.pattern === pattern);
                }).length > 0;
            }));
        });
    });

    describe("initialization with ignorePattern", function() {

        it("should ignore a normal pattern", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePattern: "ignore/me.txt" });
            assert.isTrue(ignoredPaths.contains("ignore/me.txt"));
        });

    });

    describe("initialization with file not named .eslintignore", function() {

        var ignoreFilePath;

        before(function() {
            ignoreFilePath = getFixturePath("custom-name", "ignore-file");
        });

        it("should work when cwd is a parent directory", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePath: ignoreFilePath, cwd: getFixturePath() });
            assert.notEqual(getIgnoreRules(ignoredPaths).length, countDefaultPatterns(ignoredPaths));
        });

        it("should work when the file is in the cwd", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePath: ignoreFilePath, cwd: getFixturePath("custom-name") });
            assert.notEqual(getIgnoreRules(ignoredPaths).length, countDefaultPatterns(ignoredPaths));
        });

        it("should work when cwd is a subdirectory", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePath: ignoreFilePath, cwd: getFixturePath("custom-name", "subdirectory") });
            assert.notEqual(getIgnoreRules(ignoredPaths).length, countDefaultPatterns(ignoredPaths));
        });

    });

    describe("initialization without ignorePath", function() {

        it("should not load an ignore file if none is in cwd", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, cwd: getFixturePath("no-ignore-file") });
            assert.equal(ignoredPaths.baseDir, ".");
            assert.lengthOf(getIgnoreRules(ignoredPaths), countDefaultPatterns(ignoredPaths));
        });

    });

    describe("initialization with invalid file", function() {

        var invalidFilepath;

        before(function() {
            invalidFilepath = getFixturePath("not-a-directory", ".foobaz");
        });

        it("should throw error", function() {
            assert.throws(function() {
                var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePath: invalidFilepath, cwd: getFixturePath() });
                assert.ok(ignoredPaths);
            }, "Cannot read ignore file");
        });

    });

    describe("contains", function() {

        it("should throw if initialized with invalid options", function() {
            var ignoredPaths = new IgnoredPaths(null);
            assert.throw(ignoredPaths.contains, Error);
        });

        it("should return true for file matching an ignore pattern exactly", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePattern: "undef.js" });
            assert.isTrue(ignoredPaths.contains("undef.js"));
        });

        it("should not return true for file matching an ignore pattern with leading './'", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePattern: "./undef2.js" });
            assert.isFalse(ignoredPaths.contains("undef2.js"));
        });

        it("should return true for file with leading './' matching an ignore pattern without leading './'", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePattern: "undef3.js" });
            assert.isTrue(ignoredPaths.contains("./undef3.js"));
        });

        it("should return true for file matching a child of an ignore pattern", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePattern: "undef.js" });
            assert.isTrue(ignoredPaths.contains("undef.js/subfile"));
        });

        it("should return true for file matching a grandchild of an ignore pattern", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePattern: "undef.js" });
            assert.isTrue(ignoredPaths.contains("undef.js/subdir/subfile"));
        });

        it("should return true for file matching a child of an ignore pattern with windows line termination", function() {
            sinon.stub(fs, "readFileSync")
                .withArgs("test")
                .returns("undef.js\r\n");
            sinon.stub(fs, "statSync")
                .withArgs("test")
                .returns();
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePath: "test" });

            assert.isTrue(ignoredPaths.contains("undef.js/subfile"));

            fs.readFileSync.restore();
            fs.statSync.restore();
        });

        it("should return false for file not matching any ignore pattern", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePattern: "failing.js" });
            assert.isFalse(ignoredPaths.contains("./passing.js"));
        });

    });

    describe("initialization with ignorePath containing commented lines", function() {

        var ignoreFilePath;

        before(function() {
            ignoreFilePath = getFixturePath(".eslintignoreWithComments");
        });

        it("should not include comments in ignore rules", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePath: ignoreFilePath });
            assert.equal(getIgnoreRules(ignoredPaths).length, countDefaultPatterns(ignoredPaths) + 2);
        });

    });

    describe("initialization with ignorePath containing negations", function() {
        var ignoreFilePath;

        before(function() {
            ignoreFilePath = getFixturePath(".eslintignoreWithNegation");
        });

        it("should ignore a non-negated pattern", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePath: ignoreFilePath });
            assert.isTrue(ignoredPaths.contains("dir/bar.js"));
        });

        it("should not ignore a negated pattern", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePath: ignoreFilePath });
            assert.isFalse(ignoredPaths.contains("dir/foo.js"));
        });

    });

    describe("default ignores", function() {

        it("should contain /bower_components/", function() {
            var ignoredPaths = new IgnoredPaths();
            assert.include(ignoredPaths.defaultPatterns, "/bower_components/");
        });

        it("should contain /node_modules/", function() {
            var ignoredPaths = new IgnoredPaths();
            assert.include(ignoredPaths.defaultPatterns, "/node_modules/");
        });

        it("should always apply defaultPatterns if ignore option is true", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true });
            assert.isTrue(ignoredPaths.contains("bower_components/"));
            assert.isTrue(ignoredPaths.contains("bower_components/package/file.js"));
            assert.isTrue(ignoredPaths.contains("node_modules/"));
            assert.isTrue(ignoredPaths.contains("node_modules/mocha/bin/mocha"));
        });

        it("should not apply defaultPatterns if ignore option is is false", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: false });
            assert.isFalse(ignoredPaths.contains("bower_components/"));
            assert.isFalse(ignoredPaths.contains("bower_components/package/file.js"));
            assert.isFalse(ignoredPaths.contains("node_modules/"));
            assert.isFalse(ignoredPaths.contains("node_modules/mocha/bin/mocha"));
        });

        it("should not ignore files in defaultPatterns within a subdirectory", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true });
            assert.isFalse(ignoredPaths.contains("subdir/bower_components/package/file.js"));
            assert.isFalse(ignoredPaths.contains("subdir/node_modules/package/file.js"));
        });


        it("should ignore dotfiles", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true });
            assert.isTrue(ignoredPaths.contains(".foo"));
            assert.isTrue(ignoredPaths.contains("foo/.bar"));
        });

        it("should ignore directories beginning with a dot", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true });
            assert.isTrue(ignoredPaths.contains(".foo/bar"));
            assert.isTrue(ignoredPaths.contains("foo/.bar/baz"));
        });

        it("should still ignore dotfiles when ignore option disabled", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: false });
            assert.isTrue(ignoredPaths.contains(".foo"));
            assert.isTrue(ignoredPaths.contains("foo/.bar"));
        });

        it("should still ignore directories beginning with a dot when ignore option disabled", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: false });
            assert.isTrue(ignoredPaths.contains(".foo/bar"));
            assert.isTrue(ignoredPaths.contains("foo/.bar/baz"));
        });

        it("should not ignore relative directories", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true });
            assert.isFalse(ignoredPaths.contains("./foo.js"));
            assert.isFalse(ignoredPaths.contains("../foo.js"));
            assert.isFalse(ignoredPaths.contains("/foo/../bar.js"));
        });


        it("should ignore /node_modules/ at top level relative to .eslintignore when loaded", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePath: getFixturePath(".eslintignore") });
            assert.isTrue(ignoredPaths.contains(getFixturePath("node_modules", "existing.js")));
            assert.isFalse(ignoredPaths.contains(getFixturePath("foo", "node_modules", "existing.js")));
        });

        it("should ignore /node_modules/ at top level relative to cwd without an .eslintignore", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, cwd: getFixturePath("no-ignore-file") });
            assert.isTrue(ignoredPaths.contains(getFixturePath("no-ignore-file", "node_modules", "existing.js")));
            assert.isFalse(ignoredPaths.contains(getFixturePath("no-ignore-file", "foo", "node_modules", "existing.js")));
        });

    });

    describe(".eslintignore location", function() {

        var ignoreFilePath;

        before(function() {
            ignoreFilePath = getFixturePath(".eslintignoreWithNegation");
        });

        it("should not set baseDir when no ignore file was loaded", function() {
            var ignoredPaths = new IgnoredPaths({ cwd: getFixturePath("no-ignore-file") });
            assert.equal(ignoredPaths.baseDir, ".");
        });

        it("should set baseDir relative to itself after loading", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePath: ignoreFilePath });
            assert.equal(ignoredPaths.baseDir, path.dirname(ignoreFilePath));
        });

        it("should ignore absolute file paths", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePath: ignoreFilePath });
            var asset = getFixturePath("dir/undef.js");
            assert.isTrue(ignoredPaths.contains(asset));
        });

        it("should not break negations", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePath: ignoreFilePath });
            var asset = getFixturePath("dir/foo.js");
            assert.isFalse(ignoredPaths.contains(asset));
        });

    });

    describe("two globstar '**' ignore pattern", function() {

        it("should ignore files in nested directories", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, ignorePattern: "**/*.js" });
            assert.isTrue(ignoredPaths instanceof IgnoredPaths);
            assert.isTrue(ignoredPaths.contains("foo.js"));
            assert.isTrue(ignoredPaths.contains("foo/bar.js"));
            assert.isTrue(ignoredPaths.contains("foo/bar/baz.js"));
            assert.isFalse(ignoredPaths.contains("foo.j2"));
            assert.isFalse(ignoredPaths.contains("foo/bar.j2"));
            assert.isFalse(ignoredPaths.contains("foo/bar/baz.j2"));
        });
    });

    describe("dotfiles option", function() {

        it("should add at least one pattern when false", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, dotfiles: false, cwd: getFixturePath("no-ignore-file") });
            assert(getIgnoreRules(ignoredPaths).length > ignoredPaths.defaultPatterns.length);
        });

        it("should add no patterns when true", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, dotfiles: true, cwd: getFixturePath("no-ignore-file") });
            assert.lengthOf(getIgnoreRules(ignoredPaths), ignoredPaths.defaultPatterns.length);
        });

        it("should not ignore dotfiles when true", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, dotfiles: true });
            assert.isFalse(ignoredPaths.contains(".foo"));
            assert.isFalse(ignoredPaths.contains("foo/.bar"));
        });

        it("should not ignore directories beginning with a dot when true", function() {
            var ignoredPaths = new IgnoredPaths({ ignore: true, dotfiles: true });
            assert.isFalse(ignoredPaths.contains(".foo/bar"));
            assert.isFalse(ignoredPaths.contains("foo/.bar/baz"));
        });

    });

});
