export interface apperture {
    type: string;
    id: number;
    path: any[];
    dimen?: number[];
}

interface coordParser {
    (string, boolean?): number;
};

export function parse(source: string, messageCb, handleCb) {
    var re = /%([^%]*)[*]%|(?:G04[^*]*[*]|[*\r\n])|([DGXYIJ])([0-9+-]+)/g;

    var linear = true;
    var clockwise: boolean;
    var multi_quadrant: boolean;
    var region = false;
    var apperture: number;
    var x: number, y: number, center_x: number, center_y: number;
    var sx: number, sy: number;
    var curpath: Array<any[]> = [];
    var parseX: coordParser, parseY: coordParser;

    function drawPath() {
        if (curpath.length > 1) {
            if (region) {
                handleCb({type: 'region', path: curpath});
            } else {
                handleCb({type: 'track', path: curpath, apperture: apperture});
            }
        }
        curpath = [['M', x, y]];
    }

    function parseFS(arg: string) {
        var match = arg.match(/^FS([LT])([AI])X([0-9])([0-9])Y([0-9])([0-9])$/);

        if (!match) {
            messageCb('invalid FS spec', arg);
            return;
        }

        var omitLeading = match[1] === 'L';
        var absCoord = match[2] === 'A';
        var xdigit = match.slice(3, 5).map(parseFloat)
        var ydigit = match.slice(5, 7).map(parseFloat);

        function makeParser(digits, negate) {
            var fact = 1/Math.pow(10, digits[1]);

            if (negate)
                fact = -fact;

            if (omitLeading && absCoord) {
                return function(c: string, offset?: boolean) {
                    return parseInt(c, 10) * fact;
                }
            } else {
                return function(c: string, offset?: boolean) {
                    messageCb('XXX not implemented');
                    return 0;
                }
            }
        }

        parseX = makeParser(xdigit, false);
        parseY = makeParser(ydigit, true);
    }

    function parseAD(cmd: string) {
        var match = /^AD(?:D([0-9]+)([CROP])|(.+))(?:,(.*))?$/.exec(cmd);
        var id = parseInt(match[1]);
        var shape = match[2];
        var macro = match[3];
        var argstr = match[4] || '';
        var args = argstr.split("X").map(parseFloat);
        var path = [];
        var hole = [];
        var apperture: apperture = {type: "apperture", id: id, path: null, dimen: []};

        switch (shape) {
        case "C":
            var diam = args[0];
            path.push(["M", 0, diam/2]);
            path.push(["A", diam/2, diam/2, 0, 1, 0, 0, -diam/2]);
            path.push(["A", diam/2, diam/2, 0, 1, 0, 0, diam/2]);
            hole = args.slice(1);
            if (hole.length == 0)
                apperture.dimen = [diam];
            break;
        case "R":
            var width = args[0], height = args[1];
            path.push(["M", -width/2, height/2]);
            path.push(["L", width/2, height/2]);
            path.push(["L", width/2, -height/2]);
            path.push(["L", -width/2, -height/2]);
            path.push(["L", -width/2, height/2]);
            hole = args.slice(2);
            if (hole.length == 0)
                apperture.dimen = [width, height];
            break;
        case "O":
            var xsize = args[0], ysize = args[1];
            if (ysize < xsize) {
                path.push(["M", -xsize/2, -ysize/2]);
                path.push(["A", ysize/2, ysize/2, 0, 0, 0, -xsize/2, ysize/2]);
                path.push(["L", xsize/2, ysize/2]);
                path.push(["A", ysize/2, ysize/2, 0, 0, 0, xsize/2, -ysize/2]);
                path.push(["L", -xsize/2, -ysize/2]);
            } else {
                path.push(["M", -xsize/2, ysize/2]);
                path.push(["A", xsize/2, xsize/2, 0, 0, 0, xsize/2, ysize/2]);
                path.push(["L", xsize/2, -ysize/2]);
                path.push(["A", xsize/2, xsize/2, 0, 0, 0, -xsize/2, -ysize/2]);
                path.push(["L", -xsize/2, ysize/2]);
            }
            hole = args.slice(2);
            break;
        case "P":
            var diam = args[0], nvertice = args[1], rotate = args[2] || 0;
            for (var i = 0; i <= nvertice; ++i) {
                var angle = (-rotate + i * 360 / nvertice) * 2 * Math.PI / 360;
                var xpos = Math.cos(angle) * diam / 2;
                var ypos = Math.sin(angle) * diam / 2;
                path.push(["L", xpos, ypos]);
            }
            path[0][0] = "M";   // fix up first coord to be a move
            hole = args.slice(3);
            break;
        default:
            if (macro) {
                messageCb('XXX apperture macro', macro);
            } else {
                messageCb('bad apperture', param);
            }
            break;
        }

        switch (hole.length) {
        case 1:
            // circular hole

        }

        apperture.path = path;
        handleCb(apperture);
    }

    while (true) {
        var res = re.exec(source);

        if (res === null)
            break;

        try {
            var cmd = res[2];
            var param = res[1];

            if (cmd) {
                var arg = parseInt(res[3]);

                switch (cmd) {
                case 'X': x = parseX(arg); break;
                case 'Y': y = parseY(arg); break;
                case 'I': center_x = parseX(arg, true); break;
                case 'J': center_y = parseY(arg, true); break;
                case 'D':
                    switch (arg) {
                    case 1:
                        if (linear) {
                            curpath.push(['L', x, y]);
                        } else {
                            var radius = Math.sqrt(center_x * center_x + center_y * center_y);
                            var startangle = Math.atan2(-center_y, -center_x);
                            var lastpos = curpath[curpath.length - 1].slice(-2);
                            var endangle = Math.atan2(lastpos[1] - y - center_y, lastpos[0] - x - center_x);
                            var large = 0;
                            var thres_angle = 0.1
                            if (multi_quadrant) {
                                if (Math.abs(startangle - endangle) < thres_angle)
                                    large = 1;
                                var arc = startangle - endangle;
                                if (clockwise && (arc > Math.PI || arc < 0))
                                    large = 1;
                                if (!clockwise && (arc < -Math.PI || arc > 0))
                                    large = 1;
                            }
                            if (x == lastpos[0] && y == lastpos[1]) {
                                curpath.push(['A', radius, radius, 0, 0, 1, x + 2 * center_x, y + 2 * center_y]);
                                curpath.push(['A', radius, radius, 0, 0, 1, x, y]);
                            } else {
                                curpath.push(['A', radius, radius, 0, large, clockwise ? 1 : 0, x, y]);
                            }
                        }
                        break;
                    case 2:
                        drawPath();
                        break;
                    case 3:
                        drawPath();
                        handleCb({type: "flash", id: apperture, x: x, y: y});
                        break;
                    default:
                        drawPath();
                        apperture = arg;
                        break;
                    }
                    break;
                case 'G':
                    switch (arg) {
                    case 1:
                        linear = true;
                        break;
                    case 2:
                        linear = false;
                        clockwise = true;
                        break;
                    case 3:
                        linear = false;
                        clockwise = false;
                        break;
                    case 36:
                        drawPath();
                        region = true;
                        break;
                    case 37:
                        drawPath();
                        region = false;
                        break;
                    case 74:
                        multi_quadrant = false;
                        break;
                    case 75:
                        multi_quadrant = true;
                        break;
                    default:
                        messageCb("mode", arg);
                        break;
                    }
                    break;
                }
            } else if (param) {
                var cmd = param.slice(0, 2);

                switch (cmd) {
                case 'FS':
                    parseFS(param);
                    break;
                case 'MO':
                    break;
                case 'AD':
                    parseAD(param);
                    break;
                case 'AM':
                    break;
                case 'SR':
                    break;
                case 'LP':
                    handleCb({type: 'polarity', clear: param[2] == 'C'});
                    break;
                case 'TF':
                    break;
                case 'TA':
                    break;
                default:
                    messageCb("param ", param);
                }
            }
        } catch(ex) {
            messageCb("exception ", ex, res[0]);
        }
    }
}
