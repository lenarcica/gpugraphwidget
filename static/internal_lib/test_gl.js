// Adaptions of Lessons in WebGL from Mozilla
//  https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Getting_started_with_WebGL
//
//   Student Alan lenarcic

//
// start here
//
var exports = {"test_gl":"test_gl"};
exports.blank_main = function blank_main() {
  // This has to be rewritten for anywidget:::
  var canvas = null;
  console.log("test_gl.js --- blank_main is declared.");
  canvas = document.querySelector("#glcanvas");
  if (!(canvas)) {
    canvas = document.querySelector("glcanvas");
  }
  if (!(canvas)) {
    console.log("blank_main --- Nothing is working");
  }
  console.log("blank_main -- Called");
  // Initialize the GL context
  const gl = canvas.getContext("webgl");

  // Only continue if WebGL is available and working
  if (gl === null) {
    alert(
      "Unable to initialize WebGL. Your browser or machine may not support it.",
    );
    return;
  }

  // Wow it has to set COLOR_BUFFER and then clear?  Interesting
  // Set clear color to white, fully opaque
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  // Clear the color buffer with specified clear color
  gl.clear(gl.COLOR_BUFFER_BIT);
  console.log("test_gl.js --- We are closing out WebGL.");
}

export default {exports};
