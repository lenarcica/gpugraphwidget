console.log("tgl-tgl-tgl-tgl-tgl-tgl-tgl-tgl-tgl-tgl-tgl-tgl-tgl");
const tgl = require("./test_gl.js");
console.log("glwidget.js -- here are our tgl keys.");
console.log(Object.keys(tgl));
var blank_main =null;
if ("blank_main" in Object.keys(tgl)) {
  console.log("glwidget.js -- blank_main was found in tgl keys.");
  blank_main = tgl.blank_main;
} else if (("default" in tgl) && ("blank_main" in tgl.default)) {
  blank_main = tgl.default.blank_main;
} else if (("default" in tgl) && ("exports" in tgl.default) && ("blank_main" in tgl.default.exports)) {
  blank_main = tgl.default.exports.blank_main;
} else if (("default" in Object.keys(tgl)) && ("blank_main" in Object.keys(tgl.default)) ) {
  blank_main = tgl.default.blank_main;
} else if (("default" in Object.keys(tgl)) && ("exports" in Object.keys(tgl.default)) &&
   ("blank_main" in Object.keys(tgl.default.exports))) {
  blank_main = tgl.default.exports.blank_main;
} else {
  console.log("glwidget.js - I am not sure blank main was found in tgl.");
  debugger;
}

const default_height = 500;  const default_width = 600;
var canvas_pixels = 10; const height_canvas = default_height; const width_canvas = default_width;
var canvas_tweak = 0; // Incase extra tweak to put CANVAS on SVG necessary
const debug_button_height = 75; const debug_button_width = 150;

var gl = null;

const properties = {"glwidget": "glwidget", "my_widget":"my_widget"};
console.log("--- glwidget.js() we have loaded. Hoping to get to exports.glwidget");
var p_exports = {"test_gl":tgl, "blank_main":tgl.blank_main};
p_exports.glwidget = class glwidget {
  constructor({model, el}) {
    console.log("glwidget() -- constructor called. -- ");
    if (!(model)) { console.log("glwidget -- constructor -- null model supplied.");  } else {
      console.log("glwidget -- constructor -- model is not null");
    }
    if (!(el)) { console.log("glwidget -- constructor -- null el supplied."); }
    this.model = model; this.el = el;
    if (!(!(model))) {
      this.event_types = model.get('event_types'); // Not sure what event_types we need.
    }
    this.canvasDiv = null; this.widgetDiv = null;
    var here_this = this;
    console.log("glwidget() -- constructor -- done.");
  }

  colorCanvasGreen() {
    console.log("colorCanvasGreen() called");
    // Wow it has to set COLOR_BUFFER and then clear?  Interesting
    // Set clear color to white, fully opaque
    this.canvas_gl.clearColor(0.0, 1.0, 1.0, 1.0);
    // Clear the color buffer with specified clear color
    this.canvas_gl.clear(this.canvas_gl.COLOR_BUFFER_BIT);
    console.log("glwidget -- colorCanvasGreen() --- We are closing out WebGL.");
  }
  createRenderer() {
      //jupyter-scatterplot uses regl-scatterplot which has a render.js that creates REGL instance, oddly enough
      console.log("glwidget->createRenderer()  we have called.");
      console.log("initial -create renderer called.");
      if (!(this.canvas)) {
        this.canvas = document.querySelector("#glcanvas");
        if (!(this.canvas)) {
          this.canvas = document.querySelector("glcanvas");
        }
      } else {
        console.log("this - canvas already derived.");
      }
      if (!(this.canvas_gl)) {
        try {
          this.canvas_gl = this.canvas.getContext("webgl");
        } catch {
          console.log("getting context webgl failed from the canvas.");
          debugger;
        }
      } else {
        console.log("createRenderer(): canvas_gl was already dervied.");
      }
      // Only continue if WebGL is available and working
      if (this.canvas_gl === null) {
        alert("createRenderer(): Deriving gl failed.");  return;
      }
      this.colorCanvasGreen(); 
      //this.createCanvasRegl();
      //this.createReglParameters();
      //console.log("glwidget->createRenderer() we are declaring the REGLS.");
      //declareREGLS(this.canvas_regl);
      //console.log("glwidget->createRenderer() ready to declare the CameraCentered.");
      //this.createCameraCentered();
      var here_this = this;
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
      this.debug_button.setAttribute('value','Launch Debug')
      this.debug_button.setAttribute('height','100px')
      this.debug_button.setAttribute('width', '200px')
      this.debug_button.setAttribute('top', '0px');  this.debug_button.style.top = '0px'; this.debug_button.style.left = '0px';
      this.debug_button.setAttribute('left','0px');
      this.debug_button.innerHTML = 'Launch Debug';
      this.debug_button.addEventListener('click', (event) => { console.log("graphing:::debug_button clicked"); debugger;});
      this.debug_button.addEventListener('onClick', (event) => { console.log("graphing:::debug_button clicked"); debugger;});
      this.buttonDiv.appendChild(this.debug_button);

    }
    render() {
      console.log("rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");
      console.log("rrr glwidget->class() calling::: render()");
      var here_this = this;
      if (!(this.model)) {
        console.log("rrr glwidget->render --- HEY -- this.model seems to be undefined.");
        console.log(this.model);
      }
      if (!(this.el)) {
        console.log("rrr glwidget->render --- HEY -- this.el seems to be undefined. --- This will fail");
        console.log(this.el);
      }
      console.log("rrr glwidget->class() -- stealing properties.");
      console.log("rrr model has keys:");
      console.log(Object.keys(this.model));
      console.log("rrr -- What are the properties.");
      for (const propertyName of Object.keys(properties)) {
        if ( (!(!(this.model))) && (propertyName in this.model)) {
          this[propertyName] = this.model.get(camelToSnake(propertyName));
        }
      }
      // Borrow Width Height?
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

      this.configureDebugButton();
 
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
      this.widgetDiv.style.height = (this.height ) + 'px'; 
      this.widgetDiv.setAttribute('height',(this.height ) + 'px');
      this.widgetDiv.setAttribute('width', this.width + 'px');
      // BACKGROUND -- Set to BLACK for REGL plot
      this.widgetDiv.style.background = 'var(--jp-layout-color0)';
      this.el.appendChild(this.widgetDiv);


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
      this.canvas.style.width = '100%'; this.canvas.setAttribute('id','glcanvas');
      this.canvas.style.height = '100%';
      this.canvas.setAttribute('height', this.height * canvas_pixels);
      this.canvas.setAttribute('width', this.width * canvas_pixels);
      this.canvasDiv.appendChild(this.canvas);
      console.log("--- this: a Canvas Div has been created, but is it populated and usable?");
      
      console.log("rrr glwidget->clas->render() trying to get webgl context");
      this.canvas_gl = this.canvas.getContext('webgl', {
        antialias: true,
        preserveDrawingBuffer: true,
        });
      if (!(this.canvas_gl)) {
        console.log("glwidget->class->render Hm, I think we got this.canvas_gl, it appears to occur?");
      }
      gl = this.canvas_gl;
      console.log("rrr Now calling this Create Renderer.");
      here_this = this;
      if (!window.Glwidget) {
        window.Glwidget = {
          renderer: here_this.createRenderer("renderer_for window.gLwidget"),
          versionLog: false,
        };
      } else {
        console.log("rrr --- ELSE: window.GLwidget is not null");
        here_this.createRenderer("renderer: winow.Glwidget exists?");
      }
      here_this = this;
      window.requestAnimationFrame(() => {
        console.log("glwidget.js -- requestAnimationFrame() called.");
        const initialOptions = {
          renderer: window.Glwidget.renderer,
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
        console.log("glwidget.js -- Thinking of a Camera Call.");
        //this.camera_centered.draw().then(()=> {
        // })
        here_this.model.save_changes()
      });
      this.el.addEventListener('click', (event) => {
        // Access event details (e.g., coordinates)
        console.log('Our El has been clicked:', event.x, event.y);
        console.log("This might not work, its designed for gl.");
       // Update the widget's model (if needed)
       model.set('value', model.get('value') + 1);
       model.save_changes();
      });

    }
    viewSyncHandler(viewSync) {
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
    createCanvasWebgl() {
      console.log("createCanvasWebgl() -- We are just calling blank_main;");
      blank_main();
      console.log("createCanvasWebgl() -- blank_main was called");
    }
}   

//module.exports = p_exports;
//exports = p_exports;
//export default {exports};
export default {"glwidget": p_exports.glwidget}
//export glwidget;
