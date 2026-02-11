// require version of mouse Wheel Package (requires Mouse wheel I guess"
'use strict'
//define('mouse_wheel',[], function() {
var p_exports={'authors':'to-px, parseunit,wheel'};
//var toPX = require('to-px')
//var parseUnit = require('parse-unit')
// this is parse-unit package: 
function parseUnit(str, out) {
    if (!out)
        out = [ 0, '' ]

    str = String(str)
    var num = parseFloat(str, 10)
    out[0] = num
    out[1] = str.match(/[\d.\-\+]*\s*(.*)/)[1] || ''
    return out
}
p_exports.parseUnit = parseUnit;
// This is "to-px" node package
var PIXELS_PER_INCH = 96

var defaults = {
  'ch': 8,
  'ex': 7.15625,
  'em': 16,
  'rem': 16,
  'in': PIXELS_PER_INCH,
  'cm': PIXELS_PER_INCH / 2.54,
  'mm': PIXELS_PER_INCH / 25.4,
  'pt': PIXELS_PER_INCH / 72,
  'pc': PIXELS_PER_INCH / 6,
  'px': 1
}

function toPX(str) {
  if (!str) return null

  if (defaults[str]) return defaults[str]

  // detect number of units
  var parts = parseUnit(str)
  if (!isNaN(parts[0]) && parts[1]) {
    var px = toPX(parts[1])
    return typeof px === 'number' ? parts[0] * px : null
  }

  return null
}
p_exports.toPX = toPX;
////////////////////////
//module.exports = mouseWheelListen

function mouseWheelListen(element, callback, noScroll) {
  if(typeof element === 'function') {
    noScroll = !!callback
    callback = element
    element = window
  }
  var lineHeight = toPX('ex', element)
  var listener = function(ev) {
    if(noScroll) {
      ev.preventDefault()
    }
    var dx = ev.deltaX || 0
    var dy = ev.deltaY || 0
    var dz = ev.deltaZ || 0
    var mode = ev.deltaMode
    var scale = 1
    switch(mode) {
      case 1:
        scale = lineHeight
      break
      case 2:
        scale = window.innerHeight
      break
    }
    dx *= scale
    dy *= scale
    dz *= scale
    if(dx || dy || dz) {
      return callback(dx, dy, dz, ev)
    }
  }
  element.addEventListener('wheel', listener)
  return listener
}
p_exports.mouseWheelListen = mouseWheelListen;
p_exports.mouseWheel = mouseWheelListen;
exports = p_exports;
module.exports = p_exports;
//return(exports);
//});
