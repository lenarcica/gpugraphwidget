//////////////////////////////////////////////////////////////////////////////////////
// gpuwidget.js
//
//  Alan Lenarcic 2025-05
//
// A gpuwidget that was designed to work between "gpunet.js" which is the real graph network gpu
// And then this device will manage the device between anywidget requirements.
//
// The "gpuwidget" class declared here should call a gpu element.


//console.log("tgpu-tgpu-tgpu-tgpu-tgpu-tgpu-tgpu-tgpu-tgpu-tgpu-tgpu-tgpu-tgpu");

//console.log("gpuwidget.js -- Loading gpunet.js as tgpu");
const tgpu = require("./gpunet.js");
//console.log("gpuwidget.js -- Loading gl_camera.js as gl_camera");
const tgl_camera = require("../altered_lib/gl_camera");
const hw = require("./hellogpu.js");

const HelloWorldModule = hw.HelloWorldModule;
const HelloWorldRender = hw.HelloWorldRender;

// Some of this is designed to test that ES6 Module glwidget has correctly loaded.
// This can be challenging because the "in" operator in javascript behaves weirdly.
//console.log("gpuwidget.js -- here are our tgpu keys.");
//console.log(Object.keys(tgpu));
var blank_main =null;
if ("blank_main" in Object.keys(tgpu)) {
  console.log("glwidget.js -- blank_main was found in tgpu keys.");
  blank_main = tgpu.blank_main;
} else if ("blank_main" in tgpu) {
  console.log("blank_main found in tgpu"); blank_main = tgpu.blank_main;
} else if (("default" in tgpu) && ("blank_main" in tgpu.default)) {
  blank_main = tgpu.default.blank_main;
} else if (("default" in tgpu) && ("exports" in tgpu.default) && ("blank_main" in tgpu.default.exports)) {
  blank_main = tgpu.default.exports.blank_main;
} else if (("default" in Object.keys(tgpu)) && ("blank_main" in Object.keys(tgpu.default)) ) {
  blank_main = tgpu.default.blank_main;
} else if (("default" in Object.keys(tgpu)) && ("exports" in Object.keys(tgpu.default)) &&
   ("blank_main" in Object.keys(tgpu.default.exports))) {
  blank_main = tgpu.default.exports.blank_main;
} else {
  console.log("gpuwidget.js - I am not sure blank main was found in tgpu.");
  console.log(Object.keys(tgpu));
  debugger;
}

// Dimensions of the canvas we will put plot on
const default_height = 500;  const default_width = 600;
var canvas_pixels = 10; const height_canvas = default_height; const width_canvas = default_width;
var canvas_tweak = 0; // Incase extra tweak to put CANVAS on SVG necessary
const debug_button_height = 75; const debug_button_width = 150;

var gpu = null;

async function WebGPU_GetAdapterAndDevice() {
  console.log("gpuwidget.js -- Trying to achieve adapter");
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }
  console.log("gpuwidget.js -- we reached device");
  return({device:device,adapter:adapter});
}

const properties = {"gpuwidget": "gpuwidget", "my_widget":"my_widget"};
var here_this = null;
 
console.log("--- gpuwidget.js() we have loaded. Hoping to get to exports.gpuwidget");
var p_exports = {"test_gpu":tgpu, "blank_main":tgpu.blank_main};

// Unfortunately it appears we will need to use a class here to maintain capability with ES6, though
//   it may be helpful to find ways to stay fully within a functional paradigm.
//
//  That said, the class is not particularly helpful yet with dealing with calls to GPU, or with calls
//  to Anywidget either.  We try to use this class as a single container that will have to draw
//  from multiple sources, the Canvas/WebGPU instance, the Camera, the Anywidget.
//
//  In general the gpuwidget needs to construct itself, render new frames as necessary, 
//   and report information back to anywidget when necesary.
export class gpuwidget {
  constructor({model, el}) {
    console.log("gpuwidget() -- constructor called. -- ");
    if (!(model)) { console.log("gpuwidget -- constructor -- null model supplied.");  } else {
      console.log("gpuwidget -- constructor -- model is not null");
    }
    if (!(el)) { console.log("gpuwidget -- constructor -- null el supplied."); }
    this.model = model; this.el = el;

    // How to update Camera and widget at same time?
    this.el.addEventListener('click', (event) => {
      console.log("gpuwidget -- el was clicked");  return(-1);
      if (event.target === this.canvas) {
      console.log("gpuwidget.el.eventListener('click') -- in canvas you clicked at (X,Y)=(" + event.clientX + ", " + event.clientY + ")");
      // WARNING WebGPU is down to the right, hence we can't represent matrices accurately in print statements.
      //this.gpu_camera.st_camera.permapj[3] = this.gpu_camera.st_camera.permapj[3] + .05;
      this.gpu_camera.st_camera.permapj[12] = this.gpu_camera.st_camera.permapj[12] + .05;
      console.log("gpuwidget.el.eventListener shifting the camera.");
      const frameFunction = (this_widget, tgpu) => (buttons,x,y) => {
        console.log("frameFunction called");
        here_this.gpu_pipeline = tgpu.GPUNetPipeline(here_this.gpu_pipeline, here_this.canvas_gpu, 
           here_this.gpu_camera.st_camera.permapj, here_this.adapter, here_this.device, here_this);
        tgpu.GPUNetRender(here_this.gpu_pipeline, here_this.gpu_camera.st_camera.permapj,1,here_this.count_renders);
      }
      let frameCallback = frameFunction(this, tgpu);
      requestAnimationFrame(frameCallback);
      this.count_renders = this.count_renders + 1;
      this.model.set('mouse_x', event.clientX);
      this.model.set('mouse_y', event.clientY);
      this.model.save_changes();
      console.log("gpuwidget.el.eventListener('click') -- end click at (X,Y)=(" + event.clientX + ", " + event.clientY + ")");
      } else {
        console.log("el.addEventListner -- hey: clicked but target is not canvas.");
      }
      // this.canvasDiv.
      //this.render();
    });

    if (!(!(model))) {
      this.event_types = model.get('event_types'); // Not sure what event_types we need.
    }
    this.canvasDiv = null; this.widgetDiv = null;
    this.clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };
    this.device = null; this.adapter = null; this.canvas_gpu = null; 
    this.presentationFormat=null;
    this.call_plot_again =  function() { console.log("default call_plot_again called: we will define"); }
    this.count_renders = 0;
    this.tgpu = tgpu;
    // Here we could take node/edge values from model/el if we had it`
    this.tgpu.default_graph_setup();
    here_this = this;
    console.log("gpuwidget() -- constructor -- done.");
  }
   
  
  colorCanvasGreen() {
    console.log("colorCanvasGreen() called");
    // Wow it has to set COLOR_BUFFER and then clear?  Interesting
    // Set clear color to white, fully opaque
    this.renderPassDescriptor = {
       colorAttachments: [  {
          clearValue: this.clearColor, loadOp: "clear",
          storeOp: "store",
          view: this.canvas_gpu.getCurrentTexture().createView(),},], };
    // Clear the color buffer with specified clear color
    console.log("gpuwidget -- colorCanvasGreen() --- We are closing out WebGL.");
  }
  async createRenderer(props) {
      //jupyter-scatterplot uses regl-scatterplot which has a render.js that creates REGL instance, oddly enough
      console.log("async: gpuwidget->createRenderer(count_renders=" + this.count_renders + ")  we have called.");
      var here_this = this;
      if (!(this.device)) {
        console.log("gpuwidget->createRenderer() -- we have null device, can't call this yet.");
      }
      if (!(this.canvas_gpu)) {
        this.configureWidgetGPU();
      }  else {
        console.log("this - canvas already derived.");
      }
      if ( (!(this.adapter)) && (!(this.gpu_camera)) && this.count_renders > 1) {
        console.log("gpuwidget.js->createRenderer() we have that renders is greater than one?");
        debugger;
      }
      const ADD = await WebGPU_GetAdapterAndDevice();
      console.log("--- I hope we received the Adapter and device");
      this.adapter = ADD.adapter; this.device = ADD.device;
      console.log("rrr gpuwidget->clas->render() trying to get webgl context");

      this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
      this.canvas_gpu.configure({ device:this.device, format: this.presentationFormat});
      console.log("async createRenderer() -- we are ready with material to call a Renderer");
      // Only continue if WebGL is available and working
      if (this.canvas_gpu === null) {
        alert("async createRenderer(): Deriving gpu failed.");  return;
      }
      console.log("async createRenderer() -- color canvas green");
      this.colorCanvasGreen(); 
      
      console.log("async createRenderer() -- we are generating a camera.");
      //const props = {"props":"blank test props"}
      //
      props.eye = [0.0,0.0,3.0]; props.center = [0.0,0.0,1.5];
      if (("default_center" in tgpu) && (tgpu.default_center.length == 3)) {
        props.center = tgpu.default_center;
      }
      props.aspect = this.width / this.height; props.distance = 8.0; // distance needs to be > 0
      this.gpu_camera = new tgl_camera.gl_camera(props);

      console.log("async createRenderer(): GPUNetPipeLine() launching ");

      console.log("async createRenderer(): about to run GPUNetRender once.");
      let new_cam = [0.25,0.0,0.0,0.0,
                     0.0,0.25,0.0,0.0,
                     0.0,0.0,0.25,0.0,
                     0.0,0.0,0.0,1.0]
      this.gpu_camera.st_camera.permapj = new_cam;

      this.gpu_pipeline = {'type':'blank pipeline'}
      this.gpu_pipeline = tgpu.GPUNetPipeline(this.gpu_pipeline, this.canvas_gpu, this.gpu_camera.st_camera.permapj,
                                              this.adapter, this.device, this);
      tgpu.GPUNetRender(this.gpu_pipeline, this.gpu_camera.st_camera.permapj,0,0);

      this.add_model_info();
      //console.log("--- All done with medium, now for debugger.");
      //debugger;
      this.count_renders = this.count_renders + 1;
      console.log("GPUNetRender, here we go about to call pipeline and render. ");
      const this_gpuwidget = this;
      this.gpu_camera.attach_mouse_events(props.el, this.canvas_gpu, tgpu, this_gpuwidget);

      console.log("--------------------------- We completed a createRenderer render.");
      console.log("async createRenderer() -- conclude operation. -- at conclusion count renders is now " + this.count_renders);
      //this.gpu_object = HelloWorldRender(this.canvas_gpu, this.adapter, this.device);

     //const circle_centers = [ [0,0,0], [0,1,0], [1,0,0], [-1,0,0],[0,-1,0],[0,0,1]];
     //const line_centers = [ [0,0,0],[0,1,0],
     //                    [0,0,0],[1,0,0],
     //                    [0,0,0],[-1,0,0],
     //                    [0,0,0],[0,0,1],
     //                    [0,0,0],[-1,0,0],
     //                    [0,0,0],[0,-1,0],
     //                    [0,0,0],[0,0,1]] 
      //this.gpu_object = GpunetRender(this.canvas_gpu, this.adapter, this.device, circle_vertices, line_centers);
    } 
    setupWidget({properties}) {
      console.log("rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");
      console.log("rrr glwidget->class() calling::: setupWidget()");
      var here_this = this;
      if (!(this.model)) {
        console.log("rrr glwidget->setupWidget() --- HEY -- this.model seems to be undefined.");
        console.log(this.model);
      }
      if (!(this.el)) {
        console.log("rrr glwidget->setupWidget() --- HEY -- this.el seems to be undefined. --- This will fail");
        console.log(this.el);
      }
      console.log("rrr glwidget->class() -- stealing properties.");
      console.log("rrr model has keys:");
      console.log(Object.keys(this.model));
      if (!(!(properties))) {
        console.log("rrr -- What are the properties. -- length " + properties.length);
        for (const propertyName of Object.keys(properties)) {
          if ( (!(!(this.model))) && (propertyName in this.model)) {
            this[propertyName] = this.model.get(camelToSnake(propertyName));
          }
        }
      } else {
        console.log("rrr -- Properties doesn't exist for glwidget->setupWidget()");
      }
      try {
      this.width = !Number.isNaN(+this.model.get('width')) && +this.model.get('width') > 0
        ? +this.model.get('width') : default_width; 
      this.height = !Number.isNaN(+this.model.get('height')) && +this.model.get('height') > 0
        ? +this.model.get('height') : default_height;
      } catch {
        console.log("rrr -- something wrong in deriving width/height"); debugger;
      }
      console.log("rrr glwidget->class() our attempt to generate Div width/height generates [" + this.width + "," + this.height + "]");
      // SERIOUSLY?   WE HAVE TO CREATE RANDOM NAME for our Dom ElementID?
      // Name conflicts always?
      // Create a random 6-letter string
      // From https://gist.github.com/6174/6062387
      this.randomStr = (Math.random().toString(36).substring(2, 5) +
          Math.random().toString(36).substring(2, 5));
      this.randomDIVNAME =  "MYWIDG" + this.randomStr;
      this.model.set('dom_element_id', this.randomDIVNAME);
      console.log("rrr glwidget->class() -- dom_element_id is set the name to " + this.randomDIVNAME);
      console.log("rrrr setupWidget, about to setup Buttons.");
      this.configureDebugButton();
      this.configureWidgetGPU();
    }
    configureDebugButton() {
      console.log("glwidget->class->configureDebugButton() initiate");
      console.log("rrr glwidget->class() Declaring and setting DEFAULT Jupyter DIV (name=" 
         + this.randomDIVNAME+ ") location [w,h]=[" + this.width + "," + this.height + "]");
      console.log("rrr glwidget -- Declaring a buttonDiv");
      this.buttonDiv = document.createElement('div');
      this.buttonDiv.setAttribute('id', "buttonDiv" + this.randomStr);
      this.buttonDiv.style.position = 'relative';  
      this.buttonDiv.style.display = 'flex';
      this.buttonDiv.style.flexDirection = 'column';
      this.buttonDiv.style.justifyContent = 'left';
      this.buttonDiv.style.alignItems = 'top';
      this.buttonDiv.style.width = this.width === 'auto' ? '100%' : `${this.width}px`;
      this.buttonDiv.style.height = (debug_button_height) + 'px'; 
      this.buttonDiv.setAttribute('height',(debug_button_height) + 'px');
      this.buttonDiv.setAttribute('width', debug_button_width + 'px');
      this.buttonDiv.style.background = 'var(--jp-layout-color0)';
      this.el.appendChild(this.buttonDiv);
      console.log("graph_plot->class-> it is time for debug_button");

      this.debug_button = document.createElement('button');
      this.debug_button.style.height = '75' + 'px'; this.debug_button.style.width = '150' + 'px';
      this.debug_button.setAttribute('id','debug_button');
      this.debug_button.setAttribute('name','debug_button')
      this.debug_button.setAttribute('text','Launch Debug')
      this.debug_button.style.position = 'absolute';  
      this.debug_button.setAttribute('value','Launch Debug')
      this.debug_button.setAttribute('height','100px')
      this.debug_button.setAttribute('width', '200px')
      this.debug_button.setAttribute('top', '0px');  this.debug_button.style.top = '0px'; this.debug_button.style.left = '0px';
      this.debug_button.setAttribute('left','0px');
      this.debug_button.innerHTML = 'Launch Debug';
      this.debug_button.addEventListener('click', (event) => { console.log("graphing:::debug_button clicked"); let mythis=this; debugger;});
      this.debug_button.addEventListener('onClick', (event) => { console.log("graphing:::debug_button clicked"); let mythis=this; debugger;});
      this.buttonDiv.appendChild(this.debug_button);


      this.blank_button = document.createElement('button');
      this.blank_button.style.height = '75' + 'px'; this.debug_button.style.width = '150' + 'px';
      this.blank_button.setAttribute('id','blank_button');
      this.blank_button.setAttribute('name','blank_button')
      this.blank_button.setAttribute('text','Blank')
      this.blank_button.setAttribute('value','Blank')
      this.blank_button.style.position = 'absolute';  
      this.blank_button.setAttribute('height','100px')
      this.blank_button.setAttribute('width', '150px')
      this.blank_button.setAttribute('top', '0px');  this.blank_button.style.top = '0px'; this.blank_button.style.left = '200px';
      this.blank_button.style.width = '150px';
      this.blank_button.setAttribute('left','200px');
      this.blank_button.innerHTML = 'Blank';
      this.blank_button.addEventListener('click', (event) => { console.log("graphing:::blank_button clicked"); let mythis=this; this.BlankWindow(); });
      this.blank_button.addEventListener('onClick', (event) => { console.log("graphing:::blank_button clicked"); let mythis=this;  this.BlankWindow(); });
      this.buttonDiv.appendChild(this.blank_button);

      this.reset_button = document.createElement('button');
      this.reset_button.style.height = '75' + 'px'; this.debug_button.style.width = '150' + 'px';
      this.reset_button.setAttribute('id','reset_button');
      this.reset_button.setAttribute('name','reset_button')
      this.reset_button.setAttribute('text','Reset Eye and Cam')
      this.reset_button.style.position = 'absolute';  
      this.reset_button.setAttribute('value','ResetEye and Cam')
      this.reset_button.setAttribute('height','100px')
      this.reset_button.setAttribute('width', '200px')
      this.reset_button.setAttribute('top', '0px');  this.debug_button.style.top = '0px'; this.debug_button.style.left = '400px';
      this.reset_button.setAttribute('left','400px');
      this.reset_button.innerHTML = 'Reset Eye';
      this.reset_button.addEventListener('click', (event) => { console.log("graphing:::reset_button clicked"); let mythis=this; ResetAndDraw();});
      this.reset_button.addEventListener('onClick', (event) => { console.log("graphing:::reset_button clicked"); let mythis=this; ResetAndDraw();});
      this.buttonDiv.appendChild(this.reset_button);

    }

    configureWidgetGPU() {
      console.log("rrr glwidget->class() Declaring and setting DEFAULT Jupyter DIV (name=" + this.randomDIVNAME+ ") location [w,h]=[" + this.width + "," + this.height + "]");
      console.log("rrr glwidget->class() declaring a widgetDiv");
      this.widgetDiv = document.createElement('div');
      this.widgetDiv.setAttribute('id', "widget_Div" + this.randomStr);
      this.widgetDiv.style.position = 'relative';  
      this.widgetDiv.style.display = 'flex';
      this.widgetDiv.style.flexDirection = 'column';
      this.widgetDiv.style.justifyContent = 'center';
      this.widgetDiv.style.alignItems = 'center';
      this.widgetDiv.style.width = this.width === 'auto' ? '100%' : `${this.width}px`;
      this.widgetDiv.style.height = (this.height *2.5) + 'px'; 
      this.widgetDiv.setAttribute('height',(this.height*2.5) + 'px');
      this.widgetDiv.setAttribute('width', (this.width) + 'px');
      // BACKGROUND -- Set to BLACK for REGL plot
      this.widgetDiv.style.background = 'var(--jp-layout-color0)';
      this.el.appendChild(this.widgetDiv);

      this.count_widgettext = 0;

      console.log("glwidget->class->render() generating canvasDiv.");
      // D3 Might not work given the challenges of selection.  But Ideally 
      this.canvasDiv = document.createElement('div');
      this.canvasDiv.style.position = 'absolute';
      this.canvasDiv.style.inset = '0';
      //this.canvasDiv.style.top = (debug_button_heught) + 'px';
      //this.canvasDiv.setAttribute('top', (debug_button_height) + 'px');
      this.canvasDiv.setAttribute('id', 'canvasDiv' + this.randomStr);
      this.canvasDiv.setAttribute('height',this.height + 'px');
      this.canvasDiv.setAttribute('width', this.width + 'px');
      this.widgetDiv.appendChild(this.canvasDiv);
      console.log("rrr glwidget->class we have declared canvasDiv");

      console.log("rrr glwidget->class->render() we have generated canvasDiv, declaring canvas.");
      this.canvas = document.createElement('canvas');
      this.canvas.style.width='100%'; this.canvas.setAttribute('id','glcanvas'); this.canvas.style.height= (this.height) + 'px';
      this.canvas.setAttribute('height', this.height * canvas_pixels);
      this.canvas.setAttribute('width', this.width * canvas_pixels);
      this.canvas.style.top = (.2 * this.height) + 'px';
      this.canvasDiv.appendChild(this.canvas);
      console.log("--- this: a Canvas Div has been created, but is it populated and usable?");
     
      console.log("--- Trying to get device/and material");

      this.canvas_gpu = this.canvas.getContext('webgpu', {
        antialias: true,
        preserveDrawingBuffer: true,
        });
      if (!(this.canvas_gpu)) {
        console.log("glwidget->class->render Hm, I think we got this.canvas_gl, it appears to occur?");
      }
      gpu = this.canvas_gpu;

    }
    async render(properties) {
      console.log("rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");
      console.log("rrr gpuwidget.js -> await render(count_renders=" + this.count_renders + ") -- Initiate -- properties is developing");
      console.log(Object.keys(properties));
      here_this = this;
      console.log("rrr gpuwidget.js -- calling setupWidget(properties)");
      if (!(this.canvas_gpu)) {  this.setupWidget(properties); }
      
      if (!(this.canvas_gpu)) { console.log("ERROR() -- await render() -- error, configureWidgetGPU failed."); debugger;}
 
      console.log("rrr Now calling this Create Renderer.");
      if (!window.GPUwidget) {
        properties.text = "renderer_for window.gpuwidget";
        window.GPUwidget = {
          renderer: here_this.createRenderer(properties),
          versionLog: false,
        };
        console.log("rrr -- windowGPUWidget was given this.createRenderer, now count_renders = " + this.count_renders);
      } else {
        console.log("rrr --- ELSE: window.GLwidget is not null");
        properties.text = "rrr gpuwidget.js->await render(): window.GPUwidget exists?";
        here_this.createRenderer(properties);
      }
      console.log("rrr -- async render -- now triggering a possible requestAnimationFrame(), count_renders = " + this.count_renders);
      window.requestAnimationFrame(() => {
        console.log("rrr gpuwidget.js->await render(count_renders=" + this.count_renders + ") -- requestAnimationFrame() called -- inserting renderer.");
        const initialOptions = {
          renderer: window.GPUwidget.renderer,
          canvas: here_this.canvas,
          actionKeyMap: { merge: 'meta', remove: 'alt' },
        };
      
      // Further stuff from jupyter-scatter
        if (this.width !== 'auto') {
          initialOptions.width = here_this.width;
        }
        // Not sure what API for container doew.
        // Container for widget
        //this.canvasDiv.api = this.camera_centered;
        this.viewSync = this.model.get('view_sync');
        this.viewSyncHandler(this.viewSync);
        console.log("gpuwidget.js -- async render() Thinking of a Camera Call.");
        //this.camera_centered.draw().then(()=> {
        // })
        here_this.model.save_changes()
      });
    }
    viewSyncHandler(viewSync) {
      console.log("gpuwidget.js -- viewSyncHandler has been called .");
      if (viewSync) {
        console.log("viewSyncHandler: subscribe event");
        //globalPubSub.subscribe(
        //  'gabriel_plot::view',
        //  this.externalViewChangeHandlerBound,
        //);
       } else {
        console.log("viewSyncHandler: unsubscribe event");
        //globalPubSub.unsubscribe(
        //  'gabriel_plot::view',
        //  this.externalViewChangeHandlerBound,
        //);
      }
    }
    BlankWindow() {
       console.log("gpuwidget.js->BlankWindow() we have executed.");
       // canvas_gpu is the context
       tgpu.blank_main(this.canvas_gpu, this.device);
    }
    createCanvasWebgl() {
      console.log("createCanvasWebgl() -- We are just calling blank_main;");
      blank_main();
      console.log("createCanvasWebgl() -- blank_main was called");
    }
    update_model_info() {
      const wtext = this.tgpu.info_graph_text(this.gpu_camera, this);
      this.newTextEl.innerText = wtext;
    }
    add_model_info() {
      var divWidget = document.getElementById('widget_Div' + this.randomStr);
      const wtext = this.tgpu.info_graph_text(this.gpu_camera, this);
       if (!(divWidget)) {
         console.log("divWidget: we are done.  We didn't find widget_Div");  
         divWidget = this.widgetDiv
       }
       if (!(divWidget)) {
         console.log("divWidget: on second try haven't found widget_Div.");
       }
       this.newTextEl = divWidget.querySelector('div#childText'); 
       if (!(this.newTextEl)) {
         this.newTextEl = divWidget.querySelector('.childText');
       }
       if (!(this.newTextEl)) {
         this.newTextEl = divWidget.querySelector('childText');
       }
       console.log("gl_camera.js -- We want to add text to newTextEl");
       if (!(this.newTextEl)) {
         if (this.count_widgettext > 0) {
           console.log("Bad childText -- Where is it in divWidget?`"); debugger;
         }
         console.log("Creating Child Text again");
         this.newTextEl = document.createElement("div");
         this.newTextEl.setAttribute('width', (this.width) + 'px');  
         this.newTextEl.setAttribute('height', (this.height*1.5) + 'px');
         this.newTextEl.style.position = 'absolute';
         this.newTextEl.style.top = (this.height*1) + 'px';
         this.newTextEl.style.font_family = 'Courier New';
         this.newTextEl.setAttribute('font-family','Courier New');
         this.newTextEl.style.fontFamily = 'Courier New';
         this.newTextEl.setAttribute('id','childText'); this.newTextEl.setAttribute('name','childText');
         this.newTextEl.appendChild(document.createTextNode(wtext));
         divWidget.appendChild(this.newTextEl);
         this.newTextEl.innerText = wtext;
         this.count_widgettext = this.count_widgettext + 1;
       } else {
          console.log("gl_camera.js -- We are trying to place the wtext");
          this.newTextEl.style.position = 'absolute';
          this.newTextEl.style.top = (this.height*1) + 'px';
          this.newTextEl.innerText = wtext;
       }
    }
}   


//module.exports = p_exports;
//exports = p_exports;
//export default {exports};
export default {"gpuwidget": gpuwidget, "blank_main":blank_main, "WebGPU_GetAdapterAndDevice":WebGPU_GetAdapterAndDevice}
//export glwidget;
