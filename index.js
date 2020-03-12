/* globals module: true, process: false, Buffer: false */

"use strict";

var crypto = require("crypto");
var gutil = require("gulp-util");
var _ = require("lodash");
var mkdirp = require("mkdirp");
var slash = require("slash");
var through = require("through");
var json_format = require("gulp-json-format");

var fs = require("fs");
var path = require("path");

module.exports = hashsumx;

function hashsumx(options) {
	options = _.defaults(options || {}, {
        template_input: null,
		template_output: null,
		hash: "sha1",
        hashlen: 40,
        format: 'get',
        debug: false
	});

    var dbg = options.debug;
    var cwd = process.cwd();
	var hashes = [];

    function throwError(msg) {
        throw new gutil.PluginError({
            plugin: 'gulp-hashx',
            message: msg || 'cowabunga, error dude'
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

        if (dbg) {
            console.log('processFile: ' + file.path + ' (' + path.basename(file.path) + ')');
        }

		var dirname = path.dirname(file.path);
		var basename = path.basename(file.path);
		var ext = path.extname(file.path);
		var basename2 = path.basename(file.path, ext);
		var hash = crypto.createHash(options.hash).update(file.contents, "binary").digest("hex");
        var hash_short = hash.substr(0, options.hashlen);

        var new_filename;
        if (options.format === 'embedded') {
            new_filename = path.resolve(dirname, basename2 + '._v' + hash_short + ext);
        } else {
            new_filename = path.resolve(dirname, basename + '?' + hash_short);
        }

        var new_basename = path.basename(new_filename);

        hashes.push({
            dirname: dirname,
            basename: basename,
            basename2: basename2,
            ext: ext,
            filename: file.path,
            hash: hash,
            hash_short: hash_short,
            new_filename: new_filename,
            new_basename: new_basename,
        });

        if (dbg) {
            console.log('new h: ' + hash + ' (' + JSON.stringify(hashes, null, 4) + ')');
        }

		this.push(file);
	}

	function writeSums() {
        if (dbg) {
            console.log('writing....');
            console.log(JSON.stringify(hashes, null, 4));
        }

        var template_input = options.template_input;
        if (typeof template_input === "string") {
            template_input = [ template_input ];
        }
        var template_output = options.template_output;
        if (typeof template_output === "string") {
            template_output = [ template_output ];
        }

        for (var tidx = 0; tidx < template_input.length; tidx++) {
            var template_input_file = path.resolve(cwd, template_input[tidx]);
            var template_output_file = path.resolve(cwd, template_output[tidx]);
            if (dbg) {
                console.log(template_input_file);
                console.log(template_output_file);
            }

            var indata = fs.readFileSync(template_input_file).toString('utf-8');
            if (dbg) {
                console.log(indata);
            }

            for (var idx in hashes) {
                var item = hashes[idx];
                if (dbg) {
                    console.log('doing: ' + item.basename);
                }
                indata = indata.replace(new RegExp(_.escapeRegExp(item.basename), 'g'), item.new_basename);
            }

            if (dbg) {
                console.log(indata);
            }

            var outputDir = path.dirname(template_output_file);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir);
            }
            fs.writeFileSync(template_output_file, indata);
        }

		this.emit("end");
	}

	return through(processFile, writeSums);
}

