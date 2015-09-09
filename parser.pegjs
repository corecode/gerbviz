gerber = command*
command = '%' cmd:command_content '%' newline {return cmd}
        / cmd:command_content newline {return cmd}
command_content = cmd:(func / parameter) '*' {return cmd}

func = interpolate / move / flash / apperture / region / quadrant / mode_interpolate / comment / eof

interpolate = coord:coordinate 'D' '0'? '1' {return {type: "interpolate", coord: coord}}
move = coord:coordinate_xy 'D' '0'? '2' {return {type: "move", coord: coord}}
flash = coord:coordinate_xy 'D' '0'? '3' {return {type: "flash", coord: coord}}

mode_interpolate = linear / arc
linear = ('G' '0'? '1') op:(interpolate / move)? {var v = {type: "mode", mode: "linear"}; if (op) v.op = op; return v}
arc = arc:(arc_cw / arc_ccw) op:(interpolate / move)? {var v = {type: "mode", mode: arc}; if (op) v.op = op; return v}
arc_cw = 'G' '0'? '2' {return "cw"}
arc_ccw = 'G' '0'? '3' {return "ccw"}

apperture = 'D' id:positive_integer {return {type: "apperture", id: id}}

quadrant = quadrant:(single_quadrant / multi_quadrant) {return {type: "quadrant-mode", mode: quadrant}}
single_quadrant = 'G74' {return "single-quadrant"}
multi_quadrant = 'G75' {return "multi-quadrant"}

region = region_on / region_off
region_on = 'G36' {return {type: "region-on"}}
region_off = 'G37' {return {type: "region-off"}}

comment = 'G' '0'? '4' comment:[^*]* {return {type: "comment", comment: comment.join("")}}

eof = 'M02' {return {type: "eof"}}

parameter = format / unit_mode / apperture_def / attribute

format = 'FS' om:omission_format not:notation_format x:x_number_format y:y_number_format {return {type: "format", omission: om, notation: not, x: x, y: y}}
omission_format = omit_leading / omit_trailing
omit_leading = 'L' {return "leading"}
omit_trailing = 'T' {return "trailing"}
notation_format = notation_abs / notation_inc
notation_abs = 'A' {return "abs"}
notation_inc = 'I' {return "incr"}
x_number_format = 'X' n:number_format {return n}
y_number_format = 'Y' n:number_format {return n}
number_format = pre:[0-7] post:[0-7] {return {pre: parseInt(pre), post: parseInt(post)}}

unit_mode = 'MO' unit:(inch_mode / metric_mode) {return {type: "unit-mode", mode: unit}}
inch_mode = 'IN' {return "inch"}
metric_mode = 'MM' {return "mm"}

apperture_def = 'ADD' id:positive_integer shape:apperture_name mods:apperture_modifiers? {return {type: "apperturedef", id: id, shape: shape, mods: mods}}
apperture_name = circle / rectangle / oblong / poly
circle = 'C' {return "circle"}
rectangle = 'R' {return "rect"}
oblong = 'O' {return "oblong"}
poly = 'P' {return "poly"}
apperture_modifiers = ',' m:apperture_modifier ml:('X' m:apperture_modifier {return m})* {return [m].concat(ml)}
apperture_modifier = decimal

attribute = file_attrib / apperture_attrib
file_attrib = 'TF' a:generic_attrib {a.type = "file-attr"; return a}
apperture_attrib =  'TA' a:generic_attrib {a.type = "apperture-attr"; return a}
generic_attrib = n:name ',' v:string {return {name: n, value: v}}

coordinate = &[XYIJ] x:coordinate_x? y:coordinate_y? xoff:coordinate_xoff? yoff:coordinate_yoff? {var v={}; if (x) v.x = x; if (y) v.y = y; if (xoff) v.xoff = xoff; if (yoff) v.yoff = yoff; return v}
coordinate_xy = &[XY] x:coordinate_x? y:coordinate_y? {var v={}; if (x) v.x = x; if (y) v.y = y; return v}
coordinate_x = 'X' x:integer {return x}
coordinate_y = 'Y' y:integer {return y}
coordinate_xoff = 'I' xoff:integer {return xoff}
coordinate_yoff = 'J' yoff:integer {return yoff}

integer = [+-]? [0-9]+ {return parseInt(text())}
positive_integer = [1-9][0-9]+ {return parseInt(text())}
decimal = [+-]? [0-9]+ ([.][0-9]*)? {return parseFloat(text())}

name = str:([a-zA-Z_$.][a-zA-Z_$.0-9]*) {return str[0]+str[1].join("")}
string = str:[^*%]+ {return str.join("")}

newline = [\r\n]*
