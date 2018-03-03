/// <reference path='./parser.ts' />

import GerbParse = require('./parser');
import fs = require('fs');

var source = fs.readFileSync(process.argv[2], {encoding: 'utf8'});
GerbParse.parse(source, console.log, console.log);
