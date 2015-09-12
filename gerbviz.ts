/// <reference path="parser.ts" />

document.addEventListener("DOMContentLoaded", main);

function main(evt) {
    var parse = GerbParse.parse;
    var txt = <HTMLTextAreaElement>document.getElementById("txt");
    var errors = document.getElementById("errors");
    var svg = <SVGSVGElement><any>document.getElementById("result");
    var svg_defs;

    function reparse() {
        errors.innerHTML = '';
        svg.innerHTML = '';
        svg_defs = svgAdd(svg, {defs: {id: 'defs'}});
        parse(txt.value, parseProgress, parseData);
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

    function path2obj(path) {
        return path.map(function(e){return e.join(' ')}).join(' ') + 'z';
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

            return (elem);
        }
    }

    function parseData(elem) {
        parseProgress("data", elem);

        switch (elem.type) {
        case 'apperture':
            var def = {path: {class: 'apperture', id: 'a' + elem.id, d: path2obj(elem.path)}};
            parseProgress("apperture", def);
            svgAdd(svg_defs, def);
            break;
        case 'flash':
            svgAdd(svg, {use: {'xlink:href': '#a' + elem.id, x: elem.x, y: elem.y}});
            break;
        }
    }

    txt.addEventListener('keyup', reparse_delayed);
    reparse();
}
