/* globals module: true, process: false, Buffer: false */

"use strict";

var buffertools = require("buffertools");
var crypto = require("crypto");
var gutil = require("gulp-util");
var _ = require("lodash");
var mkdirp = require("mkdirp");
var slash = require("slash");
var through = require("through");
var json_format = require("gulp-json-format");

var fs = require("fs");
var path = require("path");

function hashsumx(options) {
	options = _.defaults(options || {}, {
        template_input: null,
		template_output: null,
		hash: "sha1",
		force: false
	});
	//options = _.defaults(options, { filename: options.hash.toUpperCase() + "SUMS" });

    var cwd = process.cwd();
	var template_input_file = path.resolve(cwd, options.template_input);
	var template_output_file = path.resolve(cwd, options.template_output);
	var hashes = {};

    console.log(template_input_file);
    console.log(template_output_file);

    //throwError();

    function throwError() {
        throw new gutil.PluginError({
            plugin: 'gulp-hashx',
            message: 'premature'
        });
    }

	function processFile(file) {
		if (file.isNull()) {
			return;
		}
		if (file.isStream()) {
			this.emit("error", new gutil.PluginError("gulp-hashsum", "Streams not supported"));
			return;
		}

		//var filePath = path.resolve(options.dest, file.path);
        console.log('processFile: ' + file.path + ' (' + path.basename(file.path) + ')');

		//hashes[slash(path.relative(path.dirname(hashesFilePath), filePath))] = crypto
		var h = hashes[path.basename(file.path)] = crypto
			.createHash(options.hash)
			.update(file.contents, "binary")
			.digest("hex");

        console.log('new h: ' + h + ' (' + JSON.stringify(hashes, null, 4) + ')');

		this.push(file);
	}

	function writeSums() {
        console.log('write....');

        return;
		var lines = _.keys(hashes).sort().map(function (key) {
			return hashes[key] + options.delimiter + key + "\n";
		});
		var data = new Buffer(lines.join(""));

		if (options.force || !fs.existsSync(hashesFilePath) || buffertools.compare(fs.readFileSync(hashesFilePath), data) !== 0) {
			mkdirp(path.dirname(hashesFilePath));
			fs.writeFileSync(hashesFilePath, data);
		}
		this.emit("end");
	}

	return through(processFile, writeSums);
}

module.exports = hashsumx;
