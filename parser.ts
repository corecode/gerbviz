module GerbParse {
    export function parse(source: string, messageCb, handleCb) {
        var re = /%([^%]*)[*]%|(?:G04[^*]*[*]|[*\r\n])|([DGXYIJ])([0-9+-]+)/g;

        var linear = true;
        var region = false;
        var apperture: number;
        var x: number, y: number, center_x: number, center_y: number;
        var sx: number, sy: number;
        var curpath = [];

        function drawPath() {
            if (curpath.length > 1) {
                if (region) {
                    handleCb({type: 'region', path: curpath});
                } else {
                    handleCb({type: 'trace', path: curpath, apperture: apperture});
                }
            }
            curpath = [['M', x, y]];
        }

        function parseAD(cmd: string) {
            var match = /^ADD([0-9]+)([CROP])(?:,(.*))?$/.exec(cmd);
            var id = parseInt(match[1]);
            var shape = match[2];
            var argstr = match[3] || '';
            var args = argstr.split("X").map(parseFloat);
            var path = [];
            var hole;
            var apperture;

            switch (shape) {
            case "C":
                var diam = args[0];
                path.push(["M", 0, diam/2]);
                path.push(["A", diam/2, diam/2, 0, 1, 0, 0, -diam/2]);
                path.push(["A", diam/2, diam/2, 0, 1, 0, 0, diam/2]);
                hole = args.slice(1);
                break;
            case "R":
                var width = args[0], height = args[1];
                path.push(["M", -width/2, height/2]);
                path.push(["L", width/2, height/2]);
                path.push(["L", width/2, -height/2]);
                path.push(["L", -width/2, -height/2]);
                path.push(["L", -width/2, height/2]);
                hole = args.slice(2);
                break;
            case "O":
                var xsize = args[0], ysize = args[1];
                if (ysize < xsize) {
                    path.push(["M", -xsize/2, -ysize/2]);
                    path.push(["A", ysize/2, ysize/2, 0, 0, 1, xsize/2, -ysize/2]);
                    path.push(["L", xsize/2, ysize/2]);
                    path.push(["A", ysize/2, ysize/2, 0, 0, 1, -xsize/2, ysize/2]);
                    path.push(["L", -xsize/2, -ysize/2]);
                } else {
                    path.push(["M", xsize/2, -ysize/2]);
                    path.push(["A", xsize/2, xsize/2, 0, 0, 1, xsize/2, ysize/2]);
                    path.push(["L", -xsize/2, ysize/2]);
                    path.push(["A", xsize/2, xsize/2, 0, 0, 1, -xsize/2, -ysize/2]);
                    path.push(["L", xsize/2, -ysize/2]);
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
                // XXX error
                break;
            }

            switch (hole.length) {
            case 1:
                // circular hole

            }

            handleCb({type: "apperture", id: id, path: path});
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
                    case 'X': x = arg; break;
                    case 'Y': y = arg; break;
                    case 'I': center_x = arg; break;
                    case 'J': center_y = arg; break;
                    case 'D':
                        switch (arg) {
                        case 1:
                            curpath.push(['L', x, y]);
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
                        drawPath();
                        switch (arg) {
                        case 1:
                            linear = true;
                            break;
                        case 36:
                            region = true;
                            break;
                        case 37:
                            region = false;
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
                        break;
                    case 'TF':
                        break;
                    case 'TA':
                        break;
                    }
                    messageCb("param ", param);
                }
            } catch(ex) {
                messageCb("exception ", ex);
            }
        }
    }
}
