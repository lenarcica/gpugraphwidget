///////////////////////////////////////////////////////////////////////////////////
// gl_camera.js
//
// Alan Lenarcic 2025-04
//
// A modification of regl-camera.js into a webgpu ES6 module, with support for
//  user generated images made compatible with the gpuwidget effort.
//
// This library will generate functions that do not interact directly with regl
// and will instead allow webgl package to call them.
// Out goal is to understand why anywidget interacting with Regl/Camera generates
// plots that fade from existence.

// Include the mouseChange/mouseWheel functionality
//
//
//  Based upon the camera default math, it appears that the mouse merely moves the "eye" in space
//  using angles phi/theta to determine its location.  The eye will always focus at a point "center"
//  which is the focal point the eye stares at.  Furthermore, the "up" direction stays fixed, but it's
//  less clear how that is achieved.
//
const mouse_change = require('../external_lib/mouse_change_rq')
const mouse_wheel = require('../external_lib/mouse_wheel_rq')
const mouseListen = mouse_change.mouseListen;
const mouseWheel = mouse_wheel.mouseWheel;

console.log("altered_lib/gl_camera.js -- Welcome, initiate.");

// Including the mat4 library.
//
// "mat4" allows translations and rotations to be combined and
// Are a typical methodology for plotting 3d images
const mod_mat4 = require('./mat4_alt');
var identity = mod_mat4.identity;
var perspective = mod_mat4.perspective;
var lookAt = mod_mat4.lookAt;
var fromValues = mod_mat4.fromValues;
// adding mul from mod_mat4.mul
const mul = mod_mat4.mul;

const hpi = .5 * Math.PI;
var props = {
  "name":"default_props"
}
// State of the Camera
//
//
var st_camera = { camera_default:"camera_default" };
// As suggested from https://github.com/magcius/noclip.website/blob/main/src/gfx/helpers/ProjectionHelpers.ts
// It appears WebGL and WebGPU need different rpojection matrices
const defaultWebGPUProjection = mod_mat4.fromValues(
    1, 0,   0, 0,
    0, 1,   0, 0,
    0, 0, 0.5, 0,
    0, 0, 0.5, 1,
);
const defaultWebGLProjection = mod_mat4.fromValues(
    1, 0,  0, 0,
    0, 1,  0, 0,
    0, 0,  2, 0,
    0, 0, -1, 1,
);
class gl_camera {
  make_st_camera(default_props) {
   let nEye = [0,0,0];
   if ((!(default_props.eye)) && (default_props.eye.length==3)) { nEye = [...default_props.eye]} 
   //default_props.center = [0,0,1];
   this.st_camera = {
        view: identity(new Float32Array(16)),
        projection: identity(new Float32Array(16)),
        // permapj -- our installed perpendicular matrix
        permapj : identity(new Float32Array(16)), 
        center: new Float32Array(default_props.center || 3),
        theta: default_props.theta || 0,
        phi: default_props.phi || 0,
        distance: Math.log(default_props.distance || 5.0),
        eye: new Float32Array(nEye),
        up: new Float32Array(default_props.up || [0, 1, 0]),
        fovy: default_props.fovy || Math.PI / 4.0,
        near: typeof default_props.near !== 'undefined' ? default_props.near : 0.01,
        far: typeof default_props.far !== 'undefined' ? default_props.far : 1000.0,
        noScroll: typeof default_props.noScroll !== 'undefined' ? default_props.noScroll : false,
        flipY: !!default_props.flipY,
        dtheta: 0, dphi: 0,
        rotationSpeed: typeof default_props.rotationSpeed !== 'undefined' ? default_props.rotationSpeed : 1,
        zoomSpeed: typeof default_props.zoomSpeed !== 'undefined' ? default_props.zoomSpeed : 1,
        is_dirty: true,
        aspect:  default_props.aspect || 1,
        dirty_render: typeof default_props.dirty_render !== undefined ? !!default_props.dirty_render : false
   }
   // New center: (0,0,1),  Near = cz-(.5+a)*dd, Far = cz + (.5+a)* dd.  Near/(Near-Far)=   -(cz-(.5+a)*dd)/((1+2a)dd) = .5-cz/((1+2a)dd)
   // Let's project from [-2.5,2.5] square at z = -2.5 (for z=0) to z = 7.5 with square from -7.5 to 7.5 
   // // Constant a will be used to change dimensions of view projectsion from "dd=distance" to "distance*(1+2a)" with us centered on "(0,0,cz)" 
   //  Note this means that the "minimum" small window needs to be less than "cz-distance"
   const a = .3;
   const dd = this.st_camera.distance; const idd = 1.0/dd;
   // left,right = -2.5,2.5 so (left+right)/(right-left) = 0
   // near/(far-near) = .5 dd / (dd);
   const cz = this.st_camera.center[2];
   this.st_camera.near = -1*this.st_camera.distance + this.st_camera.near;
   //debugger;
   //  Here we update the projection matrix using the GPUperspective function
   const a_projection = mod_mat4.GPUperspective(this.st_camera.projection, this.st_camera.fovy, this.st_camera.aspect, this.st_camera.near, this.st_camera.far);
   const new_projection = mod_mat4.fromValues(   2*idd,    0,      0,   0,
                                                     0,2*idd,      0,   0,
                                                     0,   0,     idd, idd,
                                                     0,   0,  .5-cz * idd,   1 );
                     
   //this.st_camera.projection.set(new_projection,0);
   }

  constructor(default_props) {
    if (!(default_props)) {
      console.log("gl_camera: Error default_props submitted is Null");
      default_props = props;
    }
    console.log("gl_camera -- initiate -- about to props.");
    this.element = null; 
    this.damping = typeof default_props.damping !== 'undefined' ? default_props.damping : 0.9
    this.right = new Float32Array([1, 0, 0])
    this.front = new Float32Array([0, 0, 1])
    this.minDistance = Math.log(0.1);
    this.maxDistance = Math.log(1000);
    this.ddistance = 0; this.prevX = 0; this.prevY = 0
  
    this.element = (typeof default_props.element !== 'undefined') ? default_props.element : null;
    this.damping = (typeof default_props.damping !== 'undefined') ? default_props.damping : 0.9;
    this.minDistance = Math.log('minDistance' in default_props ? default_props.minDistance : 0.1)
    this.maxDistance = Math.log('maxDistance' in default_props ? default_props.maxDistance : 1000)
    
    console.log("gl_camera.js --- investigating window");
    this.is_browser = false;
    if (typeof window !== 'undefined') {
      console.log("gl_camera.js -- Type of Window isn't undefined.");
      this.is_browser = true;
    }
    this.st_camera = {camera_default:"camera_default"};
    this.make_st_camera(default_props);
  }


  damp(x) {
     var x_damped = x * this.damping
     if (Math.abs(x_damped) < 0.1) {
        return 0
     }
     this.st_camera.is_dirty = true;
     return(x_damped);
   }

   // Create Callbacks, it is possible we should move the Widget Callback to  widget math
   attach_mouse_events(el, canvas_gpu, tgpu, this_gpuwidget) {
     console.log("gl_camera.js -- attach_mouse_events is called trying to activate mouseChange, etc");
     const source = canvas_gpu.canvas; // Attach the mouse events to the canvas
     let this_camera = this;
     const this_element = el;
     const ButtonFunction = (this_camera, this_element, this_canvas, tgpu, this_gpuwidget) => (buttons,x,y) => {
       console.log("gl_camera.js -- ButtonFunction activated  -- We should have this_camera, this_element, this_canvas");

       // Target Canvas width and height to identify how much mouse down movement we have performed
       function getWidth () {
         return this_canvas ? this_canvas.canvas.offsetWidth : window.innerWidth
       }

       function getHeight () {
         return this_canvas ? this_canvas.canvas.offsetHeight : window.innerHeight
       }


       if (buttons & 1) {
         var dx = (x - this_camera.prevX) / getWidth()
         var dy = (y - this_camera.prevY) / getHeight()

         this_camera.st_camera.dtheta += this_camera.st_camera.rotationSpeed * 4.0 * dx
         this_camera.st_camera.dphi += this_camera.st_camera.rotationSpeed * 4.0 * dy
         this_camera.st_camera.is_dirty = true;
       }
       this_camera.prevY = y;  this_camera.prevX = x;
       if (Number.isNaN(this_camera.st_camera.dtheta) || (Number.isNaN(this_camera.st_camera.dphi))) {
          console.log("attach_mouse_events:::ButtonFunction -- error, dtheta=" + this_camera.st_camera.dtheta + 
                      " or dphi=" + this_camera.st_camera.dphi + " are now NAN");
          debugger;
           
       }
       if ((this_camera.st_camera.dtheta == 0) && (this_camera.st_camera.dphi == 0)) {
          console.log("attach_mouse_events:::ButtonFunction -- no change called dtheta=" + this_camera.st_camera.dtheta + 
            ", dphi = " + this_camera.st_camera.dphi + ", is dirty = " + this_camera.st_camera.is_dirty);
           return(-1);
       }
       if (!(this_gpuwidget)) {
         console.log("attach_mouse_events:::ButtonFunction: this_gpuwidget is null or undefined.");
         debugger;
       }
       if (!("model" in this_gpuwidget)) {
         console.log("ButtonFunction Run: Callback Error, this_gpuwidget does not appear to have model element.");
         debugger;
       }
       console.log("gl_camera.js::attach_mouse_events::ButtonFunction -- we are executing cam_update to respond to dphi/dtheta");
       //debugger;
       this_camera.st_camera.old_view = this_camera.st_camera.view.slice(); 
       this_camera.cam_update({});
       this_camera.st_camera.view[12] = -1.0 * this_camera.st_camera.view[12]; 
       this_camera.st_camera.view[13] = -1.0 * this_camera.st_camera.view[13]; 
       this_camera.st_camera.view[14] = -1.0 * this_camera.st_camera.view[14]; 
       if (smmat4(this_camera.st_camera.old_view,this_camera.st_camera.view)) {
         console.log("gl_camera.js:::attach_mouse_events::ButtonFunction -- we ran camera view but got nothing.");
       } else {
          console.log("gl_camera.js:: view has been updated.");
       }

       console.log("attach_mouse_events: change to x or y observed, we will derive matrix and plot.");
       // Not sure this mouse details relevant to graph plot, worth sending to python model.
       this_gpuwidget.model.set('mouse_x', event.clientX);
       this_gpuwidget.model.set('mouse_y', event.clientY);
       console.log("gl_camera.js -- attach_mouse_events:::ButtonFunction -- this_camera updated now update pj matrix");
       this_camera.st_camera.permapj = pjfunc(this_camera.st_camera); 
       console.log("gl_camera.js -- attach_mouse_events:::ButtonFunction -- this_camera updated now we call pipeline");

       console.log("gl_camera: we have new view and permapj and view let's check");

      //this.gpu_pipeline = tgpu.GPUNetPipeline(this.gpu_pipeline, this.canvas_gpu, this.gpu_camera.st_camera.permapj, this.adapter, this.device);
      //tgpu.GPUNetRender(this.gpu_pipeline, this.gpu_camera.st_camera.permapj);
       console.log("-------------------------------------------------------------------------------------------------");
       console.log("--- Trying desperately to measure: ");
       //debugger;
       if (!(this_gpuwidget.device)) {
         console.log("gl_camera.js -- error the device seems to be invalid for gpuwidget");
       }
       this_gpuwidget.count_renders = this_gpuwidget.count_renders + 1;
       if ((false) && (this_gpuwidget.count_renders >= 200)) {
          this_camera.st_camera.permapj = [.2,0,0,-.1,
                                            0,.2,0,0,
                                            0,0,.2,0,
                                            0,0,0,1.0];
       }
       this_gpuwidget.gpu_pipeline = tgpu.GPUNetPipeline(this_gpuwidget.gpu_pipeline, this_gpuwidget.canvas_gpu, this_camera.st_camera.permapj,
                   this_gpuwidget.adapter, this_gpuwidget.device);
       tgpu.GPUNetRender(this_gpuwidget.gpu_pipeline, this_camera.st_camera.permapj, 1, this_gpuwidget.count_renders+1);
       this_gpuwidget.update_model_info()
       //if (this_gpuwidget.count_renders >= 200) {
       //  console.log("gl_camera.js we manually configured projection matrix - calls debugger");
       //  debugger;
       //}
      /*
       this_gpuwidget2.gpu_pipeline = tgpu.GPUNetPipeline(this_gpuwidget2.gpu_pipeline, this_gpuwidget2.canvas_gpu, 
                    this_camera2.st_camera.permapj, this_gpuwidget2.adapter, this_gpuwidget2.device);
       tgpu.GPUNetRender(this_gpuwidget2.gpu_pipeline, this_camera2.st_camera.permapj, 1, this_gpuwidget2.count_renders+1);
     */
       console.log("gl_camera.js -- attach_mouse_events::: ButtonFunction, gpuwidget count_renders is now " + this_gpuwidget.count_renders);
       if (this_gpuwidget.count_renders >= 200) {
         //let tgpuw = this_gpuwidget; let tgpu2 = tgpu;
         // debugger;
       }
     }
     const CurriedButtonFunction = ButtonFunction(this_camera, el, canvas_gpu, tgpu, this_gpuwidget);
     console.log("gl_camera.js -- not working about to investigate.");
     mouseListen(source, CurriedButtonFunction);
     const WheelFunction = this_camera => this_element => this_canvas => (dx,dy) => {
        console.log("gl_camera.js -- WheelFunction activated, we should have this_camera now to use.");
        this.ddistance += dy / getHeight() * this_camera.st_camera.zoomSpeed
        this_camera.st_camera.is_dirty = true;
     }
     const CurriedWheelFunction = WheelFunction(this_camera, el, canvas_gpu, tgpu, this_gpuwidget);
    mouseWheel(source, CurriedWheelFunction, this_camera.st_camera.noScroll); 
  }

  // Update the camera_state, conduct event
  cam_update (up_prop) {
    if (!("st_camera" in this)) {
      console.log("gl_camera.js -- Issue we need to debug what this is now ");
      debugger;
    }
    //console.log("gl_camera.js -- calling debug on cam_update");
    //console.log("gl_camera.js -> up_prop called");
    Object.keys(up_prop).forEach(function (prop) {
        this.st_camera[prop] = up_prop[prop];
    })

    var center = this.st_camera.center
    //var eye = this.st_camera.eye
    //var up = this.st_camera.up
    var dtheta = this.st_camera.dtheta
    var dphi = this.st_camera.dphi

    // Just update state of camera?
    this.st_camera.theta += this.st_camera.dtheta
    this.st_camera.phi = clamp(
      this.st_camera.phi + this.st_camera.dphi,
      -.5 * Math.PI,
      .5 * Math.PI)
    this.st_camera.distance = clamp(
      this.st_camera.distance + this.ddistance,
      this.minDistance,
      this.maxDistance)

    this.st_camera.dtheta = this.damp(this.st_camera.dtheta)
    this.st_camera.dphi = this.damp(this.st_camera.dphi)
    this.ddistance = this.damp(this.ddistance)

    var theta = this.st_camera.theta
    var phi = this.st_camera.phi
    var r = Math.exp(this.st_camera.distance)

    // It appears we put the camera located on a sphere around center.  Apparently we work with a "vu" always modulates
    // the up perameter
    var vf = r * Math.sin(theta) * Math.cos(phi)
    var vr = r * Math.cos(theta) * Math.cos(phi)
    var vu = r * Math.sin(phi)

    for (let i = 0; i < 3; i++) {
      this.st_camera.eye[i] = center[i] + vf * this.front[i] + vr * this.right[i] + vu * this.st_camera.up[i]
    }
    // const a_projection = mod_mat4.GPUperspective(this.st_camera.projection, this.st_camera.fovy, this.st_camera.aspect, this.st_camera.near, this.st_camera.far);
    //this.st_camera.eye[0] = -1 * this.st_camera.eye[0];
    //this.st_camera.eye[1] = -1 * this.st_camera.eye[1];
    //this.st_camera.eye[2] = -1 * this.st_camera.eye[2];
    // Note lookAt returns modified st_camera.vi
    function fS(v,d) { let sm = 0; for (let i = 0; i < 3; i++) { sm = sm + ( v[i]-d[i]) * (v[i]-d[i]) }
                         return (sm); } 
    const eyeD = Math.sqrt(fS(this.st_camera.eye, this.st_camera.center));
    this.st_camera.near = -1*eyeD + .01;
   //debugger;
   //  Here we update the projection matrix using the GPUperspective function
   const a_projection = mod_mat4.GPUperspective(this.st_camera.projection, this.st_camera.fovy, this.st_camera.aspect, this.st_camera.near, this.st_camera.far);
    return(lookAt(this.st_camera.view, this.st_camera.eye, center, this.st_camera.up));
  }
  setupCamera (in_prop, block_command) {
    console.log("regl-camera-mod, setupCamera Called.");
    if (typeof st_camera.dirty !== 'undefined') {
      this.st_camera.dirty = this.st_camera.dirty || in_prop.dirty;
    }

    if ((!(!(in_prop))) && (!(!(block_command)))) {
      this.st_camera.dirty = true;
    }

    if (this.st_camera.renderOnDirty && !this.st_camera.dirty) return;

    if (!block_command) {
      block_command = in_prop
      in_prop = {}
    }
    console.log("gl_camera.js  Well we are looking to update the Camera.");
    this.updateCamera(in_prop)
    this.injectContext(block_command)
    this.st_camera.dirty = false;
    console.log("gl_camera.js  modified, SetupCamera is completed .");
  }
}
const m4v4mul = function(m4,v4) {
   let res = [0.0,0.0,0.0,0.0];
   for (let i = 0; i < 4; i++) {
     for (let j = 0; j < 4; j++) {
       res[i] = res[i] + m4[(j*4.0) + i] * v4[j];
     }
   }
   return(res);
} 
function trD(f,nd) {
  return(f.toFixed(nd));
}
// Our own Projector_func, not sure this is right implementation, seems to miss a lot of stuff.
const pjfunc = function(st_camera)  {
    // We want a projection that always faces us.
    // https://stackoverflow.com/questions/5467007/inverting-rotation-in-3d-to-make-an-object-always-face-the-camera/5487981#5487981
    //for (let ii =0; ii < pj.length;ii++) {
    //  pjn[ii] = pj[ii];
    //}
    let vw = st_camera.view;
    mul(st_camera.permapj, st_camera.projection, st_camera.view);
    let pj = st_camera.permapj;
    const dd = Math.sqrt( pj[0] * pj[0] + pj[5] * pj[5] + pj[10]*pj[10]); 
    return(st_camera.permapj);
    //if (false) {
    st_camera.permapj[2] = 0.0; st_camera.permapj[4] = 0.0; 
    st_camera.permapj[6] = 0.0; 
    st_camera.permapj[8] = 0.0; st_camera.permapj[9] = 0.0;

    // Checking calculation of 4th coordinate
    //st_camera.permapj[3] = 0.0; st_camera.permapj[7] = 0.0;
    //st_camera.per,apj[11] = dd;
    //st_camera.permapj[11] = 1.0;
    //}
    return(st_camera.permapj);
    // To be honest: this does not seem to be doing antything
    //let dd = Math.sqrt( st_camera.projection[0] * st_camera.projection[0] + 
    //  st_camera.projection[1]*st_camera.projection[1] + st_camera.projection[2] * st_camera.projection[2] ); 
    //console.log("Our estimate of dd is " + dd);
    //dd = 1.0;

    //   r_11, r_12, r_13, r_14       a + c_x
    //   r_21, r_22, r_23, r_24       b + c_y
    //                                0 + c_z
    //                                
    //                     w_15       1
    //pjn[0] = dd;  pjn[1] = 0.0; pjn[2] = 0.0;
    //pjn[4] = 0.0; pjn[5] = dd;  pjn[6] = 0.0;
    //pjn[8] = 0.0; pjn[9] = 0.0; pjn[10] = dd;
    //pjn[3] = 0.0; pjn[7] = 0,0; pjn[11] =0.0; pjn[15] = 1.0;
    //console.log("pjfunc function called");
    //for (let ii=0; ii < pj.length;ii++) {
    //  pjn[ii] = 0.0;
    //}
    //pjn[0] = 1.0; pjn[5] = 1.0;  pjn[10] = 1.0;
    //console.log("Attempt 0-1");
    //console.log(pjn[0]+ "," + pjn[1] + "," + pjn[2] + "," + pjn[3]);
    //console.log(pjn[4]+ "," + pjn[5] + "," + pjn[6] + "," + pjn[7]);
    //console.log(pjn[8]+ "," + pjn[9] + "," + pjn[10] + "," + pjn[11]);
    //console.log(pjn[12]+ "," + pjn[13] + "," + pjn[14] + "," + pjn[15]);
    return(pjn);
  }
function smmat4(m1, m2) {
  for (let i = 0; i < 16; i++) {
     if (m1[i] != m2[i]) { return(false) }
  }
  return(true);

}

function clamp(x, lo, hi) {
     return Math.min(Math.max(x, lo), hi)
   }
const gpuexports = {pjfunc:pjfunc, gl_camera:gl_camera, lookAt:lookAt, identity:identity,
   mul:mul, perspective:perspective}
exports = gpuexports;
module.exports = gpuexports;
