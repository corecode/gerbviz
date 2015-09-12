import GerbParse = require('./parser');

var parse = GerbParse.parse;
var txt = <HTMLTextAreaElement>document.getElementById("txt");
var errors = document.getElementById("errors");

var svg = <SVGSVGElement><any>document.getElementById("result");
var svg_defs: SVGElement;

var appertures: GerbParse.apperture[] = [];
var clear = false;
var containerId = 0;
var container: SVGElement, posContainer: SVGElement;

function reparse() {
    errors.innerHTML = '';
    (<HTMLElement><any>svg).innerHTML = '';
    svg_defs = svgAdd(svg, {defs: {id: 'defs'}});
    svgAddStyle(svg, `
.track {
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}
.region {
  fill-rule: evenodd;
}
`);
    container = svgAdd(svg, {g: {}});
    appertures = [];
    containerId = 0;
    clear = false;

    parse(txt.value, parseProgress, parseData);
    var bbox = maxbbox(svg);
    svg.viewBox.baseVal = bbox; // for gecko
    svg.viewBox.baseVal.x = bbox.x; // for chrome
    svg.viewBox.baseVal.y = bbox.y;
    svg.viewBox.baseVal.width = bbox.width;
    svg.viewBox.baseVal.height = bbox.height;
}

var reparse_timeout;
function reparse_delayed() {
    clearTimeout(reparse_timeout);
    reparse_timeout = setTimeout(reparse, 500);
}

function parseProgress(...args) {
    var str = args.map(function(e) {
        if (typeof e === 'object')
            return JSON.stringify(e);
        else
            return String(e);
    }).join(' ');

    var e = document.createElement('div');
    var text = document.createTextNode(str);

    e.appendChild(text);
    errors.appendChild(e);
}

function maxbbox(elem) {
    var bbox = (<SVGGElement>elem).getBBox();
    var maxApperture = appertures.filter((e) => {return e.dimen.length == 1;}).sort((a, b) => {return b.dimen[0] - a.dimen[0];});

    if (maxApperture.length > 0) {
        var maxDiam = maxApperture[0].dimen[0];
        bbox.x -= maxDiam/2;
        bbox.y -= maxDiam/2;
        bbox.width += maxDiam;
        bbox.height += maxDiam;
    }
    return bbox;
}

function path2str(path, close?: boolean) {
    var res = path.map(function(e){return e.join(' ')}).join(' ');
    if (close)
        res += 'z';
    return res;
}

var svgNs = {
    svg: "http://www.w3.org/2000/svg",
    xlink: "http://www.w3.org/1999/xlink"
};
function svgAdd(svg: SVGElement, obj) {
    var doc = svg.ownerDocument;

    var tag: string;
    for (tag in obj) {
        var attrs = obj[tag];
        var elem = doc.createElementNS(svgNs.svg, tag);

        var key: string;
        for (key in attrs) {
            var val = attrs[key];
            var keyns = key.split(':');

            if (keyns[1]) {
                elem.setAttributeNS(svgNs[keyns[0]], key, val);
            } else {
                elem.setAttribute(key, val);
            }
        }
        svg.appendChild(elem);

        return <SVGElement>elem;
    }
}

function svgAddStyle(svg: SVGElement, style: string) {
    var doc = svg.ownerDocument;
    var text = doc.createTextNode(style);
    var styleelem = doc.createElementNS(svgNs.svg, 'style');
    styleelem.appendChild(text);
    (svg.ownerSVGElement || svg).appendChild(styleelem);
}

function parseData(elem) {
    switch (elem.type) {
    case 'apperture':
        var def = {path: {class: 'apperture', id: 'a' + elem.id, d: path2str(elem.path, true)}};
        svgAdd(svg_defs, def);
        if (elem.dimen.length == 1) {
            svgAddStyle(svg, '.a' + elem.id + '{ stroke-width: ' + elem.dimen[0] + ';}');
        }
        appertures[elem.id] = elem;
        break;
    case 'flash':
        svgAdd(container, {use: {'xlink:href': '#a' + elem.id, x: elem.x, y: elem.y}});
        break;
    case 'track':
        var app = appertures[elem.apperture];
        if (app && app.dimen.length == 1)
            svgAdd(container, {path: {class: 'track a' + elem.apperture, d: path2str(elem.path)}});
        break;
    case 'region':
        svgAdd(container, {path: {class: 'region', d: path2str(elem.path, true)}});
        break;
    case 'polarity':
        if (!clear && elem.clear) {
            var maskId = 'c' + containerId++;
            var mask = svgAdd(svg_defs, {mask: {id: maskId}});
            var bbox = maxbbox(container);

            svgAdd(mask, {rect: {x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height, fill: 'white'}});
            container.setAttribute('mask', 'url(#' + maskId + ')');
            posContainer = container;
            container = mask;
        } else if (clear && !elem.clear) {
            var new_container = svgAdd(svg, {g: {}});
            posContainer.parentNode.removeChild(posContainer);
            new_container.appendChild(posContainer);
            container = new_container;
        }
        clear = elem.clear;
        break;
    default:
        parseProgress("data", elem);
        break;
    }
}

txt.addEventListener('keyup', reparse_delayed);
reparse();
