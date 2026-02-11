/**
 * Common utilities
 * @module glMatrix
 */
//define('glMatrix', [], function() {
console.log("Loading common.js::glMatrix. This was converted Sorry");
//define('glMatrix', [''], function() {
// Configuration Constants
var p_exports = {"EPSILON": 0.000001};
p_exports.EPSILON = 0.000001;
p_exports.ARRAY_TYPE = typeof Float32Array !== "undefined" ? Float32Array : Array;
p_exports.RANDOM = Math.random;
p_exports.ANGLE_ORDER = "zyx";

/**
 * Symmetric round
 * see https://www.npmjs.com/package/round-half-up-symmetric#user-content-detailed-background
 *
 * @param {Number} a value to round
 */
p_exports.round = function round(a) {
  if (a >= 0)
    return Math.round(a);

  return (a % 0.5 === 0) ? Math.floor(a) : Math.round(a);
}

/**
 * Sets the type of array used when creating new vectors and matrices
 *
 * @param {Float32ArrayConstructor | ArrayConstructor} type Array type, such as Float32Array or Array
 */
p_exports.setMatrixArray=function setMatrixArrayType(type) {
  ARRAY_TYPE = type;
}

const degree = Math.PI / 180;

const radian = 180 / Math.PI;
p_exports.degree = degree; p_exports.radian = radian;
/**
 * Convert Degree To Radian
 *
 * @param {Number} a Angle in Degrees
 */
function toRadian(a) {
  return a * degree;
}
p_exports.toRadian=toRadian;
/**
 * Convert Radian To Degree
 *
 * @param {Number} a Angle in Radians
 */
function toDegree(a) {
  return a * radian;
}
p_exports.toDegree = toDegree;

/**
 * Tests whether or not the arguments have approximately the same value, within an absolute
 * or relative tolerance of glMatrix.EPSILON (an absolute tolerance is used for values less
 * than or equal to 1.0, and a relative tolerance is used for larger values)
 *
 * @param {Number} a The first number to test.
 * @param {Number} b The second number to test.
 * @returns {Boolean} True if the numbers are approximately equal, false otherwise.
 */
function equals(a, b) {
  return Math.abs(a - b) <= EPSILON * Math.max(1.0, Math.abs(a), Math.abs(b));
}
p_exports.equals = equals;
exports = p_exports;
module.exports = p_exports;
//return(exports);
//});
//});
