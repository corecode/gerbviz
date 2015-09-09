var PEG = require("pegjs");
var fs = require("fs");

var parser = PEG.buildParser(fs.readFileSync(__dirname + "/parser.pegjs", {encoding: "utf-8"}), {trace: false});

var source = fs.readFileSync(process.argv[2], {encoding: "utf-8"});
try {
    var result = parser.parse(source);
} catch (e) {
    var loc = e.location;

    if (loc) {
        var lines = source.split("\n");

        for (var i = loc.start.line - 3; i < loc.start.line; ++i) {
            if (lines[i - 1])
                console.log(lines[i - 1]);
        }

        var str = "";
        for (var i = 1; i < loc.start.column; ++i) {
            str += " ";
        }
        console.log(str + "v---");

        for (var i = loc.start.line; i <= loc.end.line; ++i) {
            console.log(lines[i - 1]);
        }
        str = "";
        for (var i = 1; i < loc.end.column; ++i) {
            str += "-";
        }
        console.log(str + "^");

        for (var i = loc.end.line + 1; i <= loc.end.line + 3; ++i) {
            if (lines[i - 1])
                console.log(lines[i - 1]);
        }
    }

    console.log(e.message);
}

console.log(result);

var Benchmark = require('benchmark');
var b = new Benchmark('parse', function () {
    parser.parse(source);
});

b.run();

console.log(String(b));
