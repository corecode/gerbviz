import GerbParse = require('./parser');

function angle(u1, u2, v1, v2) {
    let a = Math.acos((u1 * v1 + u2 * v2) / Math.sqrt(u1*u1 + u2*u2) / Math.sqrt(v1*v1 + v2*v2));
    a = Math.abs(a);
    if (u1*v2 - u2*v1 < 0)
        a = -a;
    return a;
}

function path2poly(path: any[]) {
    let epsilon = 0.5e-3;
    let seg = [];
    let poly = [];

    function next_seg() {
        if (seg.length > 0) {
            poly.push(seg);
            seg = [];
        }
    }

    for (let motion of path) {
        switch (motion[0]) {
        case 'M':
            next_seg();
            /* FALLTHROUGH */
        case 'L':
            seg.push([motion[1], motion[2]]);
            break;
        case 'A': // A rx ry phi large-arc sweep-ccw x y
            let rx = motion[1], ry = motion[2];
            let phi = motion[3];
            let large_arc = motion[4], sweep_ccw = motion[5];
            let end = [motion[6], motion[7]];

            let last = seg[seg.length-1];

            // following https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes

            // empty motion
            if (end[0] == last[0] && end[1] == last[1])
                break;
            // linear motion
            if (rx == 0 || ry == 0) {
                seg.push(end);
                break;
            }

            if (rx < 0)
                rx = -rx;
            if (ry < 0)
                ry = -ry;

            phi %= 360;
            phi *= 2 * Math.PI / 360;

            if (large_arc != 0)
                large_arc = 1;
            if (sweep_ccw != 0)
                sweep_ccw = 1;

            let x1 = last[0], y1 = last[1];
            let x2 = end[0], y2 = end[1];
            let x1p = Math.cos(phi) * (x1 - x2) / 2 + Math.sin(phi) * (y1 - y2) / 2;
            let y1p = -Math.sin(phi) * (x1 - x2) / 2 + Math.cos(phi) * (y1 - y2) / 2;

            // enlarge radius if necessary
            let Lambda = x1p*x1p / (rx*rx) + y1p*y1p / (ry*ry);
            if (Lambda > 1) {
                rx = Math.sqrt(Lambda) * rx;
                ry = Math.sqrt(Lambda) * ry;
            }

            let cf = Math.sqrt((rx*rx * ry*ry - rx*rx * y1p*y1p - ry*ry * x1p*x1p) / (rx*rx * y1p*y1p + ry*ry * x1p*x1p));
            if (large_arc == sweep_ccw)
                cf = -cf;
            let cxp = cf * rx * y1p / ry;
            let cyp = -cf * ry * x1p / rx;

            let cx = Math.cos(phi) * cxp - Math.sin(phi) * cyp + (x1 + x2) / 2;
            let cy = Math.sin(phi) * cxp + Math.cos(phi) * cyp + (y1 + y2) / 2;

            let theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
            let delta_theta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
            if (sweep_ccw == 0 && delta_theta > 0)
                delta_theta -= 2 * Math.PI;
            else if (sweep_ccw != 0 && delta_theta < 0)
                delta_theta += 2 * Math.PI;

            // estimate number of points needed
            let r = Math.max(rx, ry);
            let alpha = 2 * Math.acos((r - epsilon) / (r + epsilon));
            let n = Math.ceil(Math.abs(delta_theta) / alpha);

            for (let i = 1; i < n; i++) {
                let theta = theta1 + delta_theta * i / n;
                let x = Math.cos(phi) * rx * Math.cos(theta) - Math.sin(phi) * ry * Math.sin(theta) + cx;
                let y = Math.sin(phi) * rx * Math.cos(theta) + Math.cos(phi) * ry * Math.sin(theta) + cy;
                seg.push([x, y]);
            }
            seg.push(end);
        }
    }
    next_seg();

    return poly;
}

function translate(poly, x, y) {
    let newpoly = [];
    for (let seg of poly) {
        let newseg = [];
        for (let point of seg) {
            newseg.push([point[0] + x, point[1] + y]);
        }
        newpoly.push(newseg);
        newseg = [];
    }
    return newpoly;
}

export function convert(list: any[]) {
    let appertures: {[id: number]: any[]} = {};

    let shape = [];

    for (let e of list) {
        switch (e.type) {
        case 'apperture':
            appertures[e.id] = path2poly(e.path);
            break;
        case 'flash':
            shape = shape.concat(translate(appertures[e.id], e.x, e.y));
            break;
        case 'region':
            shape = shape.concat(path2poly(e.path));
            break;
        }
    }

    return shape;
}


//import GerbParse = require('./parser');
import fs = require('fs');

var source = fs.readFileSync(process.argv[2], {encoding: 'utf8'});
var layerdata = [];
GerbParse.parse(source, console.log, function(e) {layerdata.push(e)});
var poly = convert(layerdata);

console.dir(poly, {depth: null, maxArrayLength: null});
