///////////////////////////////////////////////////////////////////////////////////
// glcamera.js
//
// Alan Lenarcic 2025-04
//
// A modification of regl-camera.js into a webgl module, with support for
//  user generated images.
//
// This library will generate functions that do not interact directly with regl
// and will instead allow webgl package to call them.
// Out goal is to understand why anywidget interacting with Regl/Camera generates
// plots that fade from existence.
//
// This version tries to create a function space that can be exported and used with define/require

// Include the mouseChange/mouseWheel functionality
const mouse_change = require('../external_lib/mouse_change_rq')
const mouse_wheel = require('../external_lib/mouse_wheel_rq')
const mouseChange = mouse_change.mouseChange;
const mouseWheel = mouse_wheel.mouseWheel;
// Including the mat4 library.
//
// "mat4" allows translations and rotations to be combined and
// Are a typical methodology for plotting 3d images
const mod_mat4 = require('../external_lib/mat4_semirequire');
var identity = mod_mat4.identity;
var perspective = mod_mat4.perspective;
var lookAt = mod_mat4.lookAt;

// adding mul from mod_mat4.mul
const mul = mod_mat4.mul;

const hpi = .5 * Math.PI;
var default_props = {

}
(function() {
    var element = null; 
    var damping = typeof props.damping !== 'undefined' ? props.damping : 0.9
    var right = new Float32Array([1, 0, 0])
    var front = new Float32Array([0, 0, 1])
    var minDistance = Math.log(0.1);
    var maxDistance = Math.log(1000);
    var ddistance = 0
    var prevX = 0
    var prevY = 0
    var st_camera = { camera_default:"camera_default" };


    function setup_camera_st(default_props) {
      element = (typeof default_props.element !== 'undefined') ? default_props.element : null;
      damping = (typeof default_props.damping !== 'undefined') ? props.damping : 0.9;
      minDistance = Math.log('minDistance' in default_props ? default_props.minDistance : 0.1)
      maxDistance = Math.log('maxDistance' in default_props ? default_props.maxDistance : 1000)
      prevX=0; prevY=0;
   }
   function make_st_camera(default_props) {
     st_camera = {
     view: identity(new Float32Array(16)),
     projection: identity(new Float32Array(16)),
     // permapj -- our installed perpendicular matrix
     permapj : identity(new Float32Array(16)), 
     center: new Float32Array(props.center || 3),
     theta: default_props.theta || 0,
     phi: default_props.phi || 0,
     distance: Math.log(default_props.distance || 10.0),
     eye: new Float32Array(3),
     up: new Float32Array(default_props.up || [0, 1, 0]),
     fovy: props.fovy || Math.PI / 4.0,
     near: typeof default_props.near !== 'undefined' ? default_props.near : 0.01,
     far: typeof default_props.far !== 'undefined' ? default_props.far : 1000.0,
     noScroll: typeof default_props.noScroll !== 'undefined' ? default_props.noScroll : false,
     flipY: !!default_props.flipY,
     dtheta: 0,
     dphi: 0,
     rotationSpeed: typeof default_props.rotationSpeed !== 'undefined' ? default_props.rotationSpeed : 1,
     zoomSpeed: typeof default_props.zoomSpeed !== 'undefined' ? default_props.zoomSpeed : 1,
     is_dirty: true,
     dirty_render: typeof default_props.dirty_render !== undefined ? !!default_props.dirty_render : false
   }
   function damp (x) {
     var x_damped = x * damping
     if (Math.abs(x_damped) < 0.1) {
        return 0
     }
     st_camera.is_dirty = true;
     return(x_damped);
   }
   function clamp (x, lo, hi) {
     return Math.min(Math.max(x, lo), hi)
   } 
   
   function mouse_event() {
     mouseChange(source, function (buttons, x, y) {
      if (buttons & 1) {
        var dx = (x - prevX) / getWidth()
        var dy = (y - prevY) / getHeight()

        st_camera.dtheta += st_camera.rotationSpeed * 4.0 * dx
        st_camera.dphi += st_camera.rotationSpeed * 4.0 * dy
        st_camera.is_dirty = true;
      }
      prevX = x
      prevY = y
    })

    mouseWheel(source, function (dx, dy) {
      ddistance += dy / getHeight() * st_camera.zoomSpeed
      st_camera.is_dirty = true;
    }, props.noScroll)
  }
  // Update the camera_state, conduct event
  function cam_update (up_prop) {
    //console.log("gl_camera.js -> up_prop called");
    Object.keys(up_prop).forEach(function (prop) {
      st_camera[prop] = up_prop[prop]
    })

    var center = st_camera.center
    var eye = st_camera.eye
    var up = st_camera.up
    var dtheta = st_camera.dtheta
    var dphi = st_camera.dphi

    // Just update state of camera?
    st_camera.theta += st_camera.dtheta
    st_camera.phi = clamp(
      st_camera.phi + st_camera.dphi,
      -.5 * Math.PI,
      .5 * Math.PI)
    st_camera.distance = clamp(
      st_camera.distance + ddistance,
      minDistance,
      maxDistance)

    st_camera.dtheta = damp(st_camera.dtheta)
    st_camera.dphi = damp(st_camera.dphi)
    ddistance = damp(ddistance)

    var theta = st_camera.theta
    var phi = st_camera.phi
    var r = Math.exp(st_camera.distance)

    var vf = r * Math.sin(theta) * Math.cos(phi)
    var vr = r * Math.cos(theta) * Math.cos(phi)
    var vu = r * Math.sin(phi)

    for (let i = 0; i < 3; i++) {
      eye[i] = center[i] + vf * front[i] + vr * right[i] + vu * up[i]
    }

    lookAt(st_camera.view, eye, center, up)
  }


}())
