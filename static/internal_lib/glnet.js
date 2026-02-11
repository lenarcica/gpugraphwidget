///////////////////////////////////////////////////////
// glnet.js
//
//   Functions for plotting a network in 3D using GL
//   
//
//   Alan Lenarcic 2025
//
//   Uses Rectangles and Circles solely to model points/lines
//   using a "always face camera" perspective to avoid having
//   to create 3D objects
//


// Modified version of glMatrix
const glMatrix = require("../static/external_lib/assets/glMatrix_mod.js");
//console.log("what is glMatrix like?");

// Version of mat4 using require.
const mat4 =  require("../static/external_lib/assets/mat4_semirequire.js");
//const mat4 =  require("../static/external_lib/assets/mod_mat4.js");
console.log("what is mat4 like?");

// Will mouse wheel and change come to play in other platform
//const mouse_wheel =  require("../static/external_lib/assets/util/mouse_wheel.js");
const angle_normals = require("../static/external_lib/assets/util/angle_normals_rq.js");
//import * as mouse_change from "../static/external_lib/assets/util/mouse_change_esm.js";

const camera = 
console.log("--- Trying to load camera, do we know where our goal file is?");
//const camera = require("../static/external_lib/assets/camera_require.js");
//var camera = {'camera':'camera'};
// CAMERA we Will have to write our own Camera library when we stop using REGL
//camera.createCamera = require("../static/external_lib/assets/regl-camera-mod.js");


  // RECTANGLE --- WE ARE USING RECTANGLES TO MODEL EDGES [lines] in GRAPH
  // 2D always face solutions:
  const rect_positions = [[0,.5,0.0], [0,-.5,0,0.0], [1,-.5,0.0], [1,.5,0.0] ]
  const rect_elements = [[0,1,2],[0,2,3]];
  const get_circle_positions = function(rs, ns) {
    let points = [];
    for (let i = 0; i < ns; i++) {
      let thet = (i/ns) * 2 * Math.PI;
      points.push([rs * Math.cos(thet), rs * Math.sin(thet), 0.0 ] );
    }
    return(points);
  }
  const get_circle_elements = function(rs, ns) {
    let elements = [];
    for (let i = 0; i < Math.floor(ns/2); i++) {
      elements.push([0, Math.floor(ns/2) + i, Math.floor(ns/2) + i + 1]);
      elements.push([0, Math.floor(ns/2) - i, Math.floor(ns/2) - i - 1]);
    }
    return(elements);
  }
  const circle_positions = get_circle_positions(.2,10);
  const circle_elements = get_circle_elements(.2,10);
  //const circle_centers = 
  // [ [0,0,0], [0,2,1], [1,2,3], [1,0,0],[0,1,0],[0,0,1]];
  const circle_centers = 
   [ [0,0,0], [0,1,0], [1,0,0], [-1,0,0],[0,-1,0],[0,0,1]];
  const line_centers = [ [0,0,0],[0,1,0],
                         [0,0,0],[1,0,0],
                         [0,0,0],[-1,0,0],
                         [0,0,0],[0,0,1],
                         [0,0,0],[-1,0,0],
                         [0,0,0],[0,-1,0],
                         [0,0,0],[0,0,1]]

function gl_init_roll_buffers(gl, l_x) {
  let pb = [];
  for (let i = 0; i < l_x.length; i++) {
    for (let j = 0; j < l_x[i].length; j++) {
      pb.push( (l_x[i])[j]);
    }
  }
  const pbbuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pbbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pb), gl.STATIC_DRAW);
  return pbbuffer;
}
function gl_init_glnet_buffers(gl) {
  const lineBuffer = gl_init_roll_buffers(gl, line_centers);
  const circleBuffer = gl_init_roll_buffers(gl, circle_centers);

  const numComponents = 3; // pull out 2 values per iteration
  const type = gl.FLOAT; // the data in the buffer is 32bit floats
  const normalize = false; // don't normalize
  const stride = 0; // how many bytes to get from one set of values to the next
  // 0 = use type and numComponents above
  const offset = 0; // how many bytes inside the buffer to start from
  gl.bindBuffer(gl.ARRAY_BUFFER, linebuffer); 
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  
  return {
    lineBuffer: lineBuffer, circleBuffer: circleBuffer 
  };
}

} 
// Altering a projection matrix to point toward user
// Looking into manouvering camera facing of an object to make sure it faces camera 
const permaprojection = function(viewportWidth, viewportHeight)  {
    // We want a projection that always faces us.
    // https://stackoverflow.com/questions/5467007/inverting-rotation-in-3d-to-make-an-object-always-face-the-camera/5487981#5487981
    let pj = mat4.perspective([],
        Math.PI / 4,
        viewportWidth / viewportHeight,
        0.01,
        1000)
    let dd = Math.sqrt( pj[0] * pj[0] + pj[4]*pj[4] + pj[8] * pj[8] ); 
    pj[0] = dd;  pj[1] = 0.0; pj[2] = 0.0;
    pj[4] = 0.0; pj[5] = dd;  pj[6] = 0.0;
    pj[8] = 0.0; pj[9] = 0.0; pj[10] = dd;
    return(pj);
  }


// gl is Web GL context, with most of the functionality described.
function glnet_shader_loader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object
  gl.shaderSource(shader, source);

  // Compile the shader program
  gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(
      `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
    );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}
function initShaderProgram(gl, vert_input, frag_input) {
  const vertexShader = glnet_shader_loader(gl, gl.VERTEX_SHADER, vert_input);
  const fragmentShader = glnet_shader_loader(gl, gl.FRAGMENT_SHADER, frag_input);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(
      `Unable to initialize the shader program: ${gl.getProgramInfoLog(
        shaderProgram,
      )}`,
    );
    return null;
  }

  return shaderProgram;
}
function plot_webgl(gl) {
  // objects we'll be drawing.
  const buffers = initBuffers(gl);

  // Draw the scene
  drawScene(gl, programInfo, buffers);

}
var programInfo = null;
function gen_programInfo(gl, vert_input, frag_input) {
  shaderProgram = initShaderProgram(gl,vert_input,frag_input);

  program: shaderProgram,
  attribLocations: {
    vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
    modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
  },
};
// Testing a 3D vertex/shader program with vertexes in 3D, with View/Projection
const vert_test = `
    attribute vec4 aVertexPosition;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
  `;

//
const frag_test = `
    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `;

function blank_main() { console.log("What is blank main?");
