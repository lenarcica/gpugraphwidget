///////////////////////////////////////////////////////
// gpunet.js
//
//   Functions for plotting a network in 3D using WebGPU
//
//   Alan Lenarcic 2025
//
//   Uses Rectangles and Circles solely to model points/lines
//   using a "always face camera" perspective to avoid having
//   to create 3D objects
//
//   This is a basic first implementation of a "2D graph in 3D space
//   where nodes are depicted as small circles and lines are flat rectangles
//   This is to aid the ability to render more points in the graph.
//
//   Note that WebGPU buffers behave differently than WebGL buffers and must be
//   set up with more care to the bindGroup and renderPass events.
//   This builds upon a "hello world" WebGPU example where we established the
//   challenges of interacting vector buffers, attribute buffers, and uniform buffers.

// Modified version of glMatrix
const glMatrix = require("../altered_lib/glMatrix_mod.js");
//console.log("what is glMatrix like?");

// Version of mat4 using require.
//const mat4 =  require("../static/external_lib/assets/mat4_semirequire.js");
const mat4 =  require("../altered_lib/mat4_alt.js");
console.log("what is mat4 like?");


// This network file contains the desired node locations and edges.  It can be
// altered to change the graph nodes present in the demonstration.
const network_data = require("../samples/network_001.js");



// Node locations
const graph_nodes = network_data.make_skewed(network_data.graph_nodes, network_data.skew_nodes);
//const graph_nodes =   [ 
//    [0.0,0.0, 0.0], [1.0,0.0,0.0], [-1.0,0.0,0.0], 
//    [0.0,1.0, 0.0], [0.0,0.0,1.0], [ 0.0,2.0,0.0],
//    [0.0,0.0,-1.0], [0.0,3.0,0.0], [ 0.0,0.0,0.0]];
// alternate graph node locations
//const graph_node_js = 
//   [ [.4,.4,0], [-.5,-.5,0], [.8,-.9,0], [-8.,-.9,0];

//  Edges is connectivity against the nodes in "graph_nodes";
const graph_edges = network_data.graph_edges;
const default_center = network_data.center;
const skn = network_data.skew_nodes;

//const graph_edges = [ [0,1],[0,2],[0,3],[0,4],[3,5],[0,6],[5,7], [1,8],[2,8],[3,8],[4,8],[6,8],[7,5], [0,8],[8,1],[8,2] ];

console.log(" --- We just initiated with graph_nodes = ");
console.log(graph_nodes);
// angle_normals and gl_camera
//   These libraries needed to be modified from "regl.js" examples so that they
//   can perform normal 3D camera operation in ES6 modules that will interact with WebGPU.

// Will mouse wheel and change come to play in other platform
//const mouse_wheel =  require("../static/external_lib/assets/util/mouse_wheel.js");
const angle_normals = require("../altered_lib/angle_normals_alt.js");
//import * as mouse_change from "../static/external_lib/assets/util/mouse_change_esm.js";
var pexports = {name:"temporary export"};
const lib_camera = require("../altered_lib/gl_camera.js");
//console.log("--- Trying to load camera, do we know where our goal file is?");
//const camera = require("../static/external_lib/assets/camera_require.js");
//var camera = {'camera':'camera'};
// CAMERA we Will have to write our own Camera library when we stop using REGL
//camera.createCamera = require("../static/external_lib/assets/regl-camera-mod.js");

const GPU_lwd = .02;
// RECTANGLE --- WE ARE USING RECTANGLES TO MODEL EDGES [lines] in GRAPH
// 2D always face solutions:

const rect_positions = [[0,.5,0.0], [0,-.5,0,0.0], [1,-.5,0.0], [1,.5,0.0] ]
const rect_elements = [[0,1,2],[0,2,3]];
const get_circle_vertices_0 = function(rs, ns) {
    let points = [];
    // This isn't full triangularization
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

// tranpose a 4x4 matrix, useful for some representations of data.
function tm4 (m4) {
  return([m4[0],m4[4],m4[8],m4[12],
          m4[1],m4[5],m4[9],m4[13],
          m4[2],m4[6],m4[10],m4[14],
          m4[3],m4[7],m4[11],m4[15]]);
}

// All of the buffers we would require for a single WebGPU Graph Plot
// We will need CPU bound buffers as well as Device GPU buffers.
// Note that GPUs clear their buffers very quickly, and nearly every
// renderpass, the GPU buffers will need to be rebuilt.
var graph_buffers = {
   circle_vertices:null,
   circle_vertex_buffer:null,
   line_vertices:null,
   line_vertex_buffer:null,
   graph_nodes:null,
   graph_node_buffer:null,
   graph_edges:null,
   graph_edge_buffer:null,
   uniform_buffer: null
}


// default setup of a graph assumes we have not been given graph points or edge graph.
// Default graph node locations will be at "graph_nodes" value below.
// Default graph edges will be connected by nodes based upon "graph_edges" buffer 
function default_graph_setup() {
  console.log("Default setup of graph_buffers");
  graph_buffers.circle_vertices = circle_vertices;
  graph_buffers.circle_vertex_buffer = new Float32Array( circle_vertices.length * 2);
  for (let i = 0; i < circle_vertices.length; i++) {
    graph_buffers.circle_vertex_buffer.set([circle_vertices[i][0], circle_vertices[i][1]], i*2);
  }
  graph_buffers.line_vertices = line_vertices;
  graph_buffers.line_vertex_buffer = new Float32Array( line_vertices.length);
  graph_buffers.line_vertex_buffer.set( graph_buffers.line_vertices, 0);
  graph_buffers.graph_nodes  = graph_nodes;
  graph_buffers.graph_node_buffer = new Float32Array( graph_nodes.length * 4);
  for (let i = 0; i < graph_nodes.length; i++) {
    graph_buffers.graph_node_buffer.set(graph_nodes[i],i*4);
    graph_buffers.graph_node_buffer.set([1],i*4+3);
  }
  graph_buffers.graph_edges = graph_edges;
  graph_buffers.graph_edge_buffer = new Uint32Array( graph_edges.length * 2);
  for (let i = 0; i < graph_edges.length; i++) {
    graph_buffers.graph_edge_buffer.set(graph_edges[i],i*2);
  }
  graph_buffers.uniform_buffer = new Float32Array( 20 );
  graph_buffers.uniform_buffer.set([0.25,0.0,0.0,0.0,
                                    0.0,0.25,0.0,0.0,
                                    0.0,0.0,0.25,0.0,
                                    0.0,0.0,0.0,1.0,GPU_lwd,0.0,0.0,0.0],0);

}
// Forms triangles to approximate a circle
const circle_elements = get_circle_elements(.2,10);

// Just a function that creates "edge locations" graph, which we
//  will likely not use.
function make_edge_locations(node_locations, graph_edges) {
  let el = [];
  for (let i = 0; i < graph_edges.length; i++) {
     let g_e = graph_edges[i];
     el.push(node_locations[g_e[0]]);  el.push(node_locations[g_e[1]]);
  }
  return(el);
}
const edge_locations = make_edge_locations(graph_nodes, graph_edges);

// m4v4mul simulates a matrix 4x4 times a given 4-vector
const m4v4mul = function(m4,v4) {
   let res = [0.0,0.0,0.0,0.0];
   for (let i = 0; i < 4; i++) {
     for (let j = 0; j < 4; j++) {
       res[i] = res[i] + m4[(j*4.0) + i] * v4[j];
     }
   }
   return(res);
} 

// Compute the circle vertice locations.  Note we've had a hard time testing
// AI algoritmhs so they can interpret this set.
// Note we need all triangles to go counter clockwise due to "cullMode='back'"
// To get this to work, given that thet0 is always at bottom of the screen we
// have to make sure negative one is other order.
const get_circle_vertices = function(rs, ns) {
    let points = [];
    // For fun we are missing last 2 triangles, so we can see rotation
    let thet0 = (3/2) * Math.PI;
    for (let i = 0; i < (ns/2)-1; i++) {
      let thet1 = ((2*(i+1)/ns)) * Math.PI;
      let thet2 = ((2*(i+2)/ns)) * Math.PI;
      points.push([rs * Math.cos(thet0), rs * Math.sin(thet0), 0.0 ] );
      points.push([rs * Math.cos(thet0+thet1), rs * Math.sin(thet0+thet1), 0.0 ] );
      points.push([rs * Math.cos(thet0+thet2), rs * Math.sin(thet0+thet2), 0.0 ] );
      points.push([rs * Math.cos(thet0), rs * Math.sin(thet0), 0.0 ] );
      points.push([rs * Math.cos(thet0-thet2), rs * Math.sin(thet0-thet2), 0.0 ] );  // Note reverse order
      points.push([rs * Math.cos(thet0-thet1), rs * Math.sin(thet0-thet1), 0.0 ] );
    }
  return(points);
}    
const circle_vertices = get_circle_vertices(.1,20);

function gpunet_create_circle_vertex_buffer(device, circle_vertices) {
   //console.log("gpunet_create_circle_vertex_buffer -- started");
   const vertexBufferVecSize = 2 * 4;
   const vertexBufferTotalSize = vertexBufferVecSize * graph_buffers.circle_vertices.length;
   const vertex_Buffer = device.createBuffer({ 
    label: 'Circle Vertex Locations',
    size: vertexBufferTotalSize,
    //usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
   });
   console.log("create_circle_vertex_buffer about to write to vertex_Buffer location, circle_vertices is length " + 
     graph_buffers.circle_vertices.length + " and vertex_Buffer is length " + vertexBufferTotalSize);
   device.queue.writeBuffer(vertex_Buffer, 0, graph_buffers.circle_vertex_buffer);
   return(vertex_Buffer);
}

// a "line" is a set of triangles designed to be shaped like a rectangle
// Thus we require a set of 6 points to make two triangles.
// Note we are making both triangles counter clockwise
const line_vertices = [ 0.0, 1.0, 0.0, -1.0, 1.0, 1.0, 0.0, -1.0, 1.0, -1.0, 1.0, 1.0];
// Lines will always be lines with just 4  points, the line vertices is two triangles though
const line_values = new Float32Array(line_vertices.length);
line_values.set(line_vertices, 0);
function gpunet_create_line_vertex_buffer(device, line_vertices) {

  // Lines will always be lines with just 4  points, the line vertices is two triangles though
   const line_vertex_device_buffer = device.createBuffer({ 
    label: 'Line Vertex Locations',
    size: graph_buffers.line_vertices.length * 4,
    //usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
   });
   //console.log("create_line_vertex_buffer about to write to vertex_Buffer location, spread_vertices is length " + 
   //  line_values.length + " and vertex_Buffer is length " + (line_values.length*4));
   device.queue.writeBuffer(line_vertex_device_buffer, 0, graph_buffers.line_vertex_buffer);
   return(line_vertex_device_buffer);
}
function gpunet_create_graph_edge_buffer(device) {
   //const ge_values = new Uint32Array(2*graph_edges.length)
   const graph_edge_device_buffer = device.createBuffer({ 
    label: 'Line Vertex Locations',
    size: graph_buffers.graph_edges.length * 4 * 2,
    //usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
   });
   //console.log("gpunet_create_graph_edge_buffer: creating edges of length " + (graph_buffers.graph_edges.length*4*2))
   device.queue.writeBuffer(graph_edge_device_buffer, 0, graph_buffers.graph_edge_buffer); 
   return(graph_edge_device_buffer);
}

function gpunet_create_graph_node_buffer(device) {
   //const nd_values = new Float32Array(3*graph_nodes.length)
   const graph_node_device_buffer = device.createBuffer({ 
    label: 'Node Locations',
    size: graph_buffers.graph_nodes.length * 4 * 4,
    //usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
   });
   //console.log("gpunet_create_graph_node_buffer, copying buffer of length " + (graph_buffers.graph_nodes.length*4*3));
   device.queue.writeBuffer(graph_node_device_buffer, 0, graph_buffers.graph_node_buffer);
   return(graph_node_device_buffer);
}


function gpu_init_roll_buffers(gl, l_x) {
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
function gpu_init_glnet_buffers(gpu) {
  const lineBuffer = gl_init_roll_buffers(gl, line_vertices);
  const circleBuffer = gl_init_roll_buffers(gl, circle_vertices);

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
////////////////////////////////////////////////////////////////////////
// WebGPU Functions
//
function generateGraphNodesModule(device) {
  console.log("gpunet.js->generateGraphNodesModule() launch for create ShaderModule");
  if (!("createShaderModule" in device)) {
    console.log("gpunet.js->Device ShaderModuleError: GraphNodes -- Error the module is missing.");
    debugger;
  }
  const module = device.createShaderModule({
    label: 'Point circles',
    code: `
      struct VS_Uniforms_0 {
        pjmat: mat4x4f,
        lwd: f32
      };
      //const test_node_loc = array(
      //   vec3f(0.4,0.4,0.0),
      //   vec3f(-0.3,-0.5,0.0),
      //   vec3f(0.8,-0.9,0.0),
      //   vec3f(-0.9,0.5,0.0));
      struct VertexPoints {  vertex_point: vec2f };
      // Note: this is annoying that I can't seem to give a Node vertex other than wasting 1 point
      struct graphNode {  node_loc: vec3f, w:f32 };
     struct VertexOut {
       @builtin(position) position : vec4f,
       @location(0) color : vec4f,
     }
      //struct graphEdge {  i0: u32, i1: u32 };
      @group(0) @binding(0) var<storage, read> v_vert: array<VertexPoints>;
      @group(0) @binding(1) var<storage, read> v_n: array<graphNode>;
      //@group(0) @binding(2) var<storage, read> v_e: array <graphEdge>;
      @group(0) @binding(2) var<uniform> u0: VS_Uniforms_0;
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
        @builtin(instance_index) instanceIndex: u32
      //) -> @builtin(position) vec4f {
      ) -> VertexOut {
      var oneAns = u0.pjmat * vec4f(
        v_n[instanceIndex].node_loc[0],
        v_n[instanceIndex].node_loc[1],
        v_n[instanceIndex].node_loc[2], 1.0) + 
        vec4f(u0.pjmat[3][3] * v_vert[vertexIndex].vertex_point.x,
              u0.pjmat[3][3] * v_vert[vertexIndex].vertex_point.y,
              0.0,0.0);
      //oneAns[2] = oneAns[2]; // We clearly want small positive number for z location
      //oneAns = u0.pjmat * vec4f(
      //  test_node_loc[instanceIndex].x + v_vert[vertexIndex].vertex_point[0], 
      //  test_node_loc[instanceIndex].y + v_vert[vertexIndex].vertex_point[1], 
      //  test_node_loc[instanceIndex].z, 1.0);

      //return vec4f(
      //  v_n[instanceIndex].node_loc[0] + v_vert[vertexIndex].vertex_point[0], 
      //  v_n[instanceIndex].node_loc[1] + v_vert[vertexIndex].vertex_point[1], 
      //  v_n[instanceIndex].node_loc[2], 1.0);
        //return(vec4f( v_vert[vertexIndex].vertex_point,0.0,1.0));
        var output: VertexOut;
        output.position[0] = oneAns[0];
        output.position[1] = oneAns[1];
        output.position[2] = oneAns[2];
        output.position[3] = oneAns[3];
        if (instanceIndex == 99) {
          output.color = vec4f(v_n[instanceIndex].node_loc[0],
                               v_n[instanceIndex].node_loc[1],
                               v_n[instanceIndex].node_loc[2],1.0);    // Location as color 
          output.color = vec4f(1.0,
                               0.0,
                               0.0,1.0);    // Location as color 
          output.position= vec4f(2*v_vert[vertexIndex].vertex_point[0] +.8, 
                                 2*v_vert[vertexIndex].vertex_point[1] +.8,.1,1.0);
        } else if (instanceIndex==0) {
          output.color = vec4f(1.0,0.0,0.0,1.0); // RED
        } else if (instanceIndex==1) {
          output.color = vec4f(1.0,.753,0.796,1.0); // PINK
        } else if (instanceIndex==2) {
          output.color = vec4f(0.0,0.0,1.0,1.0);    // BLUE
        } else if (instanceIndex==3) {
          output.color = vec4f(1.0,.5,0.0,1.0);     // ORANGE
        } else if (instanceIndex==4) {
          output.color = vec4f(0.0,1.0,0.0,1.0);    // GREEN
        } else if (instanceIndex==5) {
          output.color = vec4f(0.8,0.0,0.8,1.0);    // PURPLE
        } else if (instanceIndex==6) {
          output.color = vec4f(0.05,0.05,0.05,1.0); // BLACK
        } else if (instanceIndex==7) {
          output.color = vec4f(0.0,0.0,0.4,1.0);    // Dark Blue 
        } else if (instanceIndex==8) {
          output.color = vec4f(1.0,0.0,0.0,0.0);  // RED
        } else if (instanceIndex==10) {
                                                    // BLACK?
                                                    // Put this in upper right corner
           output.position = vec4f(2*v_vert[vertexIndex].vertex_point[0] + .8,
                                   2*v_vert[vertexIndex].vertex_point[1] + .8,1,1.0);
           output.color = vec4f(0.05,0.05, 0.05, 1.0);
        } else {
          output.color = vec4f(.2,0.8,0.7,1.0);
        }
        //return(oneAns);
        return(output);
      }
 
      @fragment fn fs(fragData: VertexOut) -> @location(0) vec4f {
        //return vec4f(1.0, 0.0, 0.0, 1.0);
        return(fragData.color);
      }
    `,
  });
  return(module);
}
function generateGraphEdgesModule(device) {
  //console.log("gpunet.js->generateGraphEdgesModule() launch for create Edges Module");
  if (!("createShaderModule" in device)) {
    console.log("gpunet.js->Device ShaderModuleError: GraphEdges -- Error the module is missing.");
    debugger;
  }
  const module = device.createShaderModule({
    label: 'EdgeGraph',
    code: `
      struct VS_Uniforms_0 {
        pjmat: mat4x4f,
        lwd: f32
      };
      struct VertexPoints {  vertex_point: vec2f };
      struct graphNode {  node_loc: vec3f, w:f32 };
      struct graphEdge {  i0: u32, i1: u32 };
      @group(0) @binding(0) var<storage, read> v_vert: array<VertexPoints>;
      @group(0) @binding(1) var<storage, read> v_n: array<graphNode>;
      @group(0) @binding(2) var<storage, read> v_e: array <graphEdge>;
      @group(0) @binding(3) var<uniform> u0: VS_Uniforms_0;
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
        @builtin(instance_index) instanceIndex: u32
      ) -> @builtin(position) vec4f {
        let lvert: vec2f = v_vert[vertexIndex].vertex_point;
        let p0: vec4f = u0.pjmat * vec4f( v_n[v_e[instanceIndex].i0].node_loc, 1.0);
        let p1: vec4f = u0.pjmat * vec4f( v_n[v_e[instanceIndex].i1].node_loc, 1.0);
        // (p0.x, p0,y)
        // (p1.x, p1.y)  
        let dy = p1.y-p0.y; let dx = p1.x-p0.x;
        let dsq = 1.0 / sqrt(dy* dy + dx * dx);
        let pm = vec4f( - u0.lwd * lvert[1] * dy * dsq, u0.lwd * lvert[1] * dx * dsq, 0.0,0.0);
        if (lvert[0] <= .1) {
           return pm + p0;
        } else {
           return pm + p1;
        }
      }
 
      @fragment fn fs() -> @location(0) vec4f {
        return vec4f(0.0, 0.7, 0.7, 1.0);
      }
    `,
  });
  return(module);
}

function VertexGPUPipeline(device, module) {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const pipeline = device.createRenderPipeline({
    label: 'pipeline for 2d static rotating camera network',
    layout: 'auto',
    vertex: {
      module, 
      //buffers: [
      //  {arrayStride: 2 * 4, // 2 floats in each vertex location in 2d
      //   attributes: [{shaderLocation:0,offset:0, format:'float32x2'}]
      //  }
      //], 
      //entryPoint: 'vs',
    },
    fragment: {
      //entryPoint: 'fs',
      module,
      targets: [{ format: presentationFormat }],
    },
  });
  return(pipeline);
}
//pexports.VertexGPUPipeline = VertexGPUPipeline;
function GPURenderPass() {
 const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        view: 0,
        clearValue: [0.9, 0.9, 0.9, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      // view: <- to be filled out when we render
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    }
  };  
  return(renderPassDescriptor);
}
//pexports.GPURenderPass = GPURenderPass;
function createPipeline(device, module, a_gpuwidget, what_pipeline) {
  const InitT = "gpunet.js->createPipeline(" + what_pipeline + "): ";
  console.log(InitT + "-- initiated");
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  console.log(InitT + " -- Creating the pipeline");
  //const positionBufferLayoutDesc = createDepthTextureDesc(device, a_gpuwidget, what_pipeline) 
  //console.log(InitT + "-- DepthTextureDesc was created supplying back in pipeline about to call createRenderPipeline -- ");
  const pipeline = device.createRenderPipeline({
    label: 'gpunet pipeline: ' + what_pipeline,
    layout: 'auto',
    vertex: {
      module:module,
      //entryPoint: "vs",
      //buffers:[ {
      //  arrayStride: (4) * 4, //Basic Stride
      //  attributes: [
      //    {shaderLocation: 0, offset: 0, format: 'float32x3'}, //Position
      //    {shaderLocation:  1, offset: 12, format: 'unorm8x4'},
      //  ] }
      //],
    },
    fragment: {
      module, entryPoint: "fs",
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    } 
    //positionBufferLayoutDesc.depthAttachment
    //depthStencil: { depthWriteEnabled:true,
    //   depthCompare:'less', format:'depth24plus-stencil8'}
  });
  console.log(InitT + "-- pipeline was generated with createRenderPipeline -- all concluded.");
  return(pipeline);
}

const unif_buffers_size = 20;
// Universal module uniform values
const uniform_Values = new Float32Array( unif_buffers_size );
function default_uniform_Values(uniform_Values) {
  //if (!(uniform_Values)) {
  //  uniform_Values = new Float32Array( unif_buffers_size );
  //}
  uniform_Values.set([0.25,0.0,0.0,0.0,
                     0.0,0.25,0.0,0.0,
                     0.0,0.0,.25,0.0,
                     0.0,0.0,0.0,1.0,GPU_lwd,0.0,0.0,0.0],0);
  return(uniform_Values);
}
default_uniform_Values(uniform_Values);

// Adding Depth prediction, necessary to keep circles from over writing each other
function createDepthTextureDesc(device, a_gpuwidget, what_depth_texture) {
  //console.log("What are parts of a_gpuwidget");
  //debugger;
  const InitT = "gpunet.js->createDepthTextureDesc(" + what_depth_texture + "): ";
  console.log(InitT + "-- we have called just initiated " + what_depth_texture);
  const colorTexture = a_gpuwidget.canvas_gpu.getCurrentTexture();
  const colorTextureView = colorTexture.createView();
  console.log(InitT + "-- We created a color Texture.");
  const GPURenderPassColorAttachment = {
    view: colorTextureView,
    clearValue: { r: .9, g: .9, b: .9, a: 1 },
    loadOp: "clear",
    storeOp: "store",
  };
  const colorAttachment = GPURenderPassColorAttachment;
  const depthTextureDesc = {
   size:[a_gpuwidget.width, a_gpuwidget.height,1], dimension:'2d',
   format: 'depth24plus-stencil8',
   usage: GPUTextureUsage.RENDER_ATTACHMENT};
  console.log(InitT + "-- about to create a depthTexture.");
  let depthTexture = device.createTexture(depthTextureDesc);
  let depthTextureView = depthTexture.createView();
  console.log(InitT + "-- Well we created a depth texture");
  const depthAttachment = {
   view:depthTextureView, depthClearValue: 1,
   depthLoadOp: 'clear',
   depthStoreOp: 'store',
   stencilClearValue: 0,
   stencilLoadOp: 'clear',
   stencilStoreOp: 'store'
   };
   const renderPassDesc = {
     colorAttachments:[colorAttachment], 
     depthStencilAttachment: depthAttachment,
     depthTexture:depthTexture, depthTextureView:depthTextureView
   };
   console.log(InitT + "-- We have a renderPassDesc generated");
   return({renderPassDesc:renderPassDesc, depthAttachment:depthAttachment, colorAttachment:colorAttachment,
     colorTextureView:colorTextureView, GPURenderPassColorAttachment:GPURenderPassColorAttachment})
}
function create_uniform_device_buffer(device,newpj, lwd) {
  //console.log("create_uniform_device_buffer() called");
  // Note Toy values for uniform
  if (!(graph_buffers.uniform_buffer)) {
    graph_buffers.uniform_buffer = new Float32Array( 16 + 4 );
  }
  graph_buffers.uniform_buffer.set(newpj,0);
  graph_buffers.uniform_buffer.set([lwd,0.0,0.0,0.0], 16);
  const uniform_device_buffer = device.createBuffer({ size: graph_buffers.uniform_buffer.length * 4, 
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
  device.queue.writeBuffer(uniform_device_buffer, 0, graph_buffers.uniform_buffer);
  return(uniform_device_buffer);
}
function update_uniform_device_buffer(device, new_pj, gpu_pipeline) {
  //console.log("update_uniform_device_buffer, called, with new_pj of length " + new_pj.length + " and unif_buffers_size is " + unif_buffers_size);
  if (!(graph_buffers.uniform_buffer)) {
    console.log("update_uniform_device_buffer initiating new uniform_Values of size " + unif_buffers_size);
    graph_buffers.uniform_buffer = new Float32Array( unif_buffers_size );
    graph_buffers.uniform_buffer.set(new_pj, 0);
    graph_buffers.uniform_buffer.set([lwd,0.0,0.0,0.0],16)
  } else {
    //console.log("update_uniform_device: update new_pj to [" + new_pj[0] + "," + new_pj[4] + "," + new_pj[8] + ",...]");
    graph_buffers.uniform_buffer.set(new_pj, 0);
  }
  if (!(gpu_pipeline.uniform_device_buffer)) {
    gpu_pipeline.uniform_device_buffer = device.createBuffer({ size: graph_buffers.uniform_buffer.length * 4, 
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
  }
  //console.log("-- update uniform device buffer we must be running right?");
  device.queue.writeBuffer(gpu_pipeline.uniform_device_buffer, 0, graph_buffers.uniform_buffer);
}
function create_nodebindGroup(device,pipeline, vertex_buffer0, node_loc_buffer1, uniform_buffer2) {
  const our_bindgroup = device.createBindGroup({
    label: 'bind group for objects',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: vertex_buffer0 }},
      { binding: 1, resource: { buffer: node_loc_buffer1 }},
      { binding: 2, resource: { buffer: uniform_buffer2}}
    ],
  });
  //console.log("create_nodebindGroup -- writing nodebindGroup to buffer");
  return(our_bindgroup);
}

function create_edgebindGroup(device,pipeline, vertex_buffer0, node_loc_buffer1, 
  edge_loc_buffer2, uniform_buffer3) {
  const our_bindgroup = device.createBindGroup({
    label: 'bind group for objects',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: vertex_buffer0 }},
      { binding: 1, resource: { buffer: node_loc_buffer1 }},
      { binding: 2, resource: { buffer: edge_loc_buffer2 }},
      { binding: 3, resource: { buffer: uniform_buffer3}}
    ],
  });
  //console.log("create_nodebindGroup -- writing nodebindGroup to buffer");
  return(our_bindgroup);
}
/*
https://stackoverflow.com/questions/70284258/destroyed-texture-texture-used-in-a-submit-when-using-a-video-texture-in-ch"
It turns out that the lifetime of an video external texture is very limited. When your code returns control to the browser, the external texture will be destroyed. For most 3d applications, this would most likely be when the requestAnimationFrame finishes.

In order to alleviate this you have to create both the bind group and the external texture in the same frame as you render. It may be helpful to put your external texture(s) in a separate bind group since you will have to recreate it.

e.g.

function frame() {

    var externalTextureBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(1),
        entries: [
            {
                binding: 0,
                resource: device.importExternalTexture({
                    source: video,
                    }),
            },
        ],
    }); 

    // additional setup.

    passEncoder.setBindGroup(1, externalTextureBindGroup);
    passEncoder.drawIndexed(group.count, 1, group.start, 0);

    // additional draws

    requestAnimationFrame(frame);

}
*/
function GPUNetPipeline(gpu_pipeline, gpucontext, new_pj,adapter, device, a_gpuwidget) {
  //console.log("gpunet.js -- GPUNetRender():  We are starting");
  
  //console.log("gpunet.js -- GPUNetRender(): Camera Generate"); 
  //gpucamera = new lib_camera.gl_camera();
  //console.log("gpunet.js -- renderpass generate");
  if ( (!(gpu_pipeline))  || (!(gpu_pipeline.node_pipeline) )) {
    console.log("gpunet.js -- GPUNetPipeline, about to generate new gpu_pipeline --- seems as if gpu_pipeline is loading first time");
    ///debugger;
    const moduleNodes = generateGraphNodesModule(device);
    const moduleEdges = generateGraphEdgesModule(device);
    console.log("gpunet.js -- GPUNetPipeline() -- Calling createPipeline");
    gpu_pipeline = {
       device:device, adapter:adapter,
       //rpd:rpd,
       moduleNodes: moduleNodes, moduleEdges:moduleEdges, 
       node_pipeline: createPipeline(device, moduleNodes, a_gpuwidget, "node_pipeline"),
       edge_pipeline: createPipeline(device, moduleEdges, a_gpuwidget, "edge_pipeline"),
       context: gpucontext,
       encoder: null,
       circle_vertex_device_buffer : gpunet_create_circle_vertex_buffer(device),
       line_vertex_device_buffer : gpunet_create_line_vertex_buffer(device),
       graph_node_device_buffer : gpunet_create_graph_node_buffer(device),
       graph_edge_device_buffer : gpunet_create_graph_edge_buffer(device)
    }
    update_uniform_device_buffer(device,new_pj, gpu_pipeline) 
  } else {
    console.log("gpunet.js -- don't need to re-initiate, material is here.");
  }


  //console.log("gpunet.js -- binding the uniforms to the pipeline");
  //default_uniform_Values();
  //  Note all of these feed on javascript memory in "graph_buffers" structure
  //gpu_pipeline.uniform_device_buffer = create_uniform_device_buffer(gpu_pipeline.device, newpj, GPU_lwd);
  //gpu_pipeline.circle_vertex_device_buffer = gpunet_create_circle_vertex_buffer(gpu_pipeline.device);
  //gpu_pipeline.line_vertex_device_buffer = gpunet_create_line_vertex_buffer(gpu_pipeline.device);
  //gpu_pipeline.graph_node_device_buffer = gpunet_create_graph_node_buffer(gpu_pipeline.device);
  //gpu_pipeline.graph_edge_device_buffer = gpunet_create_graph_edge_buffer(gpu_pipeline.device);
  //gpu_pipeline.node_bindgroup = create_nodebindGroup(gpu_pipeline.device, gpu_pipeline.node_pipeline, 
  //  gpu_pipeline.circle_vertex_device_buffer, gpu_pipeline.graph_node_device_buffer, gpu_pipeline.uniform_device_buffer);
  //gpu_pipeline.edge_bindgroup = create_edgebindGroup(gpu_pipeline.device, gpu_pipeline.edge_pipeline, 
  //  gpu_pipeline.line_vertex_device_buffer, gpu_pipeline.graph_node_device_buffer, gpu_pipeline.graph_edge_device_buffer, 
  //  gpu_pipeline.uniform_device_buffer);
  return(gpu_pipeline); 
  //return({device:device, adapter:adapter, gpucontext:gpucontext,
  //        rpd:rpd, moduleNodes:moduleNodes, moduleEdges:moduleEdges,
  //        node_pipeline:node_pipeline, edge_pipeline:edge_pipeline,
  //        encoder:encoder, graph_buffers:graph_buffers,
  //        uniform_device_buffer:uniform_device_buffer, 
  //        circle_vertex_device_buffer:circle_vertex_device_buffer, line_vertex_device_buffer:line_vertex_device_buffer,
  //        graph_node_device_buffer:graph_node_device_buffer, graph_edge_device_buffer:graph_edge_device_buffer,
  //        node_bindgroup:node_bindgroup, edge_bindgroup:edge_bindgroup });
}
function compute_circle_plot_loc(graph_buffers, iN) {
  const nodec = graph_buffers.graph_nodes[iN];
  const circle_vertices = graph_buffers.circle_vertices;
  //console.log("-- compute_circle plot loc, node=" + iN + "[" + nodec[0] + "," + nodec[1] + "," + nodec[2] + "] circle_vertices length " + circle_vertices.length);
  let MyV = [];
  const nV = 3;
  let permapj = [];
  for (let i = 0; i < 16; i++) { permapj.push(graph_buffers.uniform_buffer[i]) };
  //console.log("-- compute_circle plot permapj is "); console.log(permapj);
  for (let i = 0; i <  circle_vertices.length / nV; i++) {
    let St = [nodec[0], nodec[1], nodec[2], 1.0];
    //console.log("-- compute_circle i = " + i + ", St is ");
    St = m4v4mul(permapj, St);
    St[0] = St[0] + (circle_vertices[i])[0];
    St[1] = St[1] + (circle_vertices[i])[1];

    MyV.push( St );
    //console.log("-- compute_circle i=" + i + "th solution is ");
    console.log(MyV[i]);
  }
  //console.log("comput_circle_plot_loc done. ");
  return(MyV);
}
function compute_circle_center_loc(graph_buffers, iN) {
  const nodec = graph_buffers.graph_nodes[iN];
  const circle_vertices = graph_buffers.circle_vertices;
  let permapj = [];
  for (let i = 0; i < 16; i++) { permapj.push(graph_buffers.uniform_buffer[i]) };
  console.log(permapj);
  //console.log("-- compute_circle plot loc, node=" + iN + "[" + nodec[0] + "," + nodec[1] + "," + nodec[2] + "] circle_vertices length " + circle_vertices.length);
  let St = [nodec[0], nodec[1], nodec[2], 1.0];
  St = m4v4mul(permapj, St);
  //console.log("You compute");
  //debugger;
  return(St);
}
function trD(f,nd) {
  return(f.toFixed(nd));
}
function printV(MyV, iN) {
   return("l[" + iN + "]=(" + trD(MyV[0],2) + "," + trD(MyV[1],2) + "," + trD(MyV[2],2) + ")");
}
//tgpu.compute_circle_plot_loc(mythis.gpu_pipeline,0);
//tgpu.GPUNetRender(mythis.gpu_pipeline, null);
function GPUNetRender(gpupipe, new_pj, vb, num_prints) {
  //console.log("gpunet.js -- GPUrender called -- ");
  if (!(new_pj)) {
    console.log("gpunet.js -- GPUNetRender.js -- new_pj is null"); debugger;
  }
  if (!(num_prints)) { num_prints = 0; }
  if (vb >= 1) {
    console.log("gpunet.js -- GPUNetRender -- about to execute for new_pj[0] = " + new_pj[0]);
  }
  //const uniform_device_buffer = gpupipe.uniform_device_buffer;
  const device = gpupipe.device;
  // make a command encoder to start encoding commands
  const encoder = device.createCommandEncoder({ label: 'GPUNet encoder generated by create command' });

  if (vb >= 0 ) {
    //console.log("gpunet.js -- GPUNetRender.js -- gpupipe will be nodebindGroup ");
  }
  // Create pipelines once, render pass every time;
  const rpd = GPURenderPass();

  // https://webgpufundamentals.org/webgpu/lessons/webgpu-orthographic-projection.html
  //rpd.colorAttachments[0].view =
  //   gpupipe.context.getCurrentTexture().createView();
  //console.log("Let's look for context");
  //debugger;
  rpd.canvasTexture = gpupipe.context.getCurrentTexture()
  rpd.colorAttachments[0].view = rpd.canvasTexture.createView();
  //rpd.colorAttachments[0].view = rpd.canvasTexture.createView();
  let depthTexture = rpd.depthTexture;  // Don't I have two elements and need 2?
  if (!depthTexture || depthTexture.width != rpd.canvasTexture.width ||
       depthTexture.height  != rpd.canvasTexture.height) {
    if (depthTexture) {
      depthTexture.destroy();
    }
    depthTexture = device.createTexture({
       size: [rpd.canvasTexture.width, rpd.canvasTexture.height],
       format: 'depth24plus', usage:GPUTextureUsage.RENDER_ATTACHMENT, });
    
    rpd.depthTexture = depthTexture;
  }
  rpd.depthStencilAttachment.view = depthTexture.createView();

  //const node_pipeline = createPipeline(device, gpupipe.moduleNodes);
  //const edge_pipeline = createPipeline(device, gpupipe.moduleEdges);
  const node_pipeline = gpupipe.node_pipeline; 
  const edge_pipeline = gpupipe.edge_pipeline;
  const uniform_device_buffer = update_uniform_device_buffer(gpupipe.device, new_pj, gpupipe) 
  //const node_pipeline = gpupipe.node_pipeline; 
  //const edge_pipeline=gpupipe.edge_pipeline;
  const node_bindgroup = create_nodebindGroup(gpupipe.device, node_pipeline, 
    gpupipe.circle_vertex_device_buffer, gpupipe.graph_node_device_buffer, gpupipe.uniform_device_buffer);
  if (vb >= 0) {
    console.log("gpunet.js -- GPUNetRender.js -- create_edge_bindgroup");
  }
  const edge_bindgroup = create_edgebindGroup(gpupipe.device, edge_pipeline, 
    gpupipe.line_vertex_device_buffer, gpupipe.graph_node_device_buffer, gpupipe.graph_edge_device_buffer, 
    gpupipe.uniform_device_buffer);

  //const node_bindgroup = gpupipe.node_bindgroup;
  //const edge_bindgroup = gpupipe.edge_bindgroup;
  const line_vertex_device_buffer = gpupipe.line_vertex_device_buffer;
  const circle_vertex_device_buffer = gpupipe.circle_vertex_device_buffer;
  const graph_nodes = graph_buffers.graph_nodes;
  const graph_edges = graph_buffers.graph_edges;
  if (!(new_pj)) {
    console.log("GPUNetRender() issue, new_pj is null  -- ERROR TRIGGER");  debugger;
    ///new_pj = [0.25,0.0,0.0,0.0,0.0,0.25,0.0,0.0,0.0,0.0,0.25,0.0,0.0,0.0,0.0,1.0]
    ///console.log("GPUNetRender -- the size of new_pj is " + new_pj.length);
  }
  //new_pj = [0.5,0.0,0.0,0.0,
  //          0.0,0.5,0.0,0.0,
  //          0.0,0.0,0.5,0.0,
  //          0.0,0.0,0.0,1.0];
  //update_uniform_device_buffer(gpupipe.device, new_pj, gpupipe.unif_cam_buffer);
  //
  const graph_node_device_buffer = gpupipe.graph_node_device_buffer;
  const graph_edge_device_buffer = gpupipe.graph_edge_device_buffer;
  // make a render pass encoder to encode render specific commands
  //console.log("gpunet.js -- render node_pass begin");
  
  const node_pass = encoder.beginRenderPass(rpd);
  //console.log("gpunet.js -- setting nodes_pipeline");
  //if (false) {
  node_pass.setPipeline(node_pipeline);
  //console.log("gpunet.js -- setting vertex buffer -- note vertex buffers and storage buffers appear to not work together");
  //pass.setVertexBuffer(0, vertex_buffer);
  //console.log("gpunet.js -- setting node_bindgroup");
  node_pass.setBindGroup(0, node_bindgroup);
  //console.log("gpunet.js -- about to call draw call: nodes length is " + graph_buffers.line_vertex_buffer.length + ", cv length " + graph_buffers.circle_vertex_buffer.length);
  //pass.draw(basic_attrs.length, circle_vertices.length);  // call our vertex shader 3 times (if function is (3))
  //debugger;
  //  note circle_vertices is wound up, line_vertices is unwound
  //console.log("Try and run node_pass.draw() with circle_vertices.length=" + graph_buffers.circle_vertices.length +", graph_nodes.length=" + graph_buffers.graph_nodes.length);
  node_pass.draw(graph_buffers.circle_vertices.length, graph_buffers.graph_nodes.length);  // call our vertex shader 3 times (if function is (3))
  //console.log("-- After node_pass.draw() calling debugger.");
  //debugger;
  //}
  //node_pass.draw(circle_vertices.length, 4);  // call our vertex shader 3 times (if function is (3))
  //node_pass.end();
  // make a render pass encoder to encode render specific commands
  //const commandBuffer = encoder.finish();
  //console.log("gpunet.js -- render edge pass has begun.");
  //const encoder2 = device.createCommandEncoder({ label: 'GPUNet encoder generated by create command' });
  //console.log("gpunet.js -- render edge pass begin");
  //const edge_pass = encoder2.beginRenderPass(rpd);
  const edge_pass = node_pass;
  //console.log("gpunet.js -- setting edge_pipeline");
  edge_pass.setPipeline(edge_pipeline);
  //console.log("gpunet.js -- setting edge buffer -- note vertex buffers and storage buffers appear to not work together");
  //pass.setVertexBuffer(0, vertex_buffer);
  //console.log("gpunet.js -- setting node_bindgroup");
  edge_pass.setBindGroup(0, edge_bindgroup);
  //console.log("gpunet.js -- about to call draw edges "); 
  //pass.draw(basic_attrs.length, circle_vertices.length);  // call our vertex shader 3 times (if function is (3))
  //debugger;
  //console.log("gpunet.js -- about to call edge_pass draw over a fraction " + (graph_buffers.line_vertices.length/2) +
  //   " line vertices over " + graph_buffers.graph_edges.length + " graph edges")
  edge_pass.draw(graph_buffers.line_vertices.length, graph_buffers.graph_edges.length);  // call our vertex shader 3 times (if function is (3))
  edge_pass.end(); 
  if ((vb >= 1) && (num_prints > 4)) {
    const iN=1;
    console.log("gpunet.js -- GPUNetRender new_pj[12] = " + new_pj[12] + " and graph_buffers.uniform_buffer[12] is " + graph_buffers.uniform_buffer[12]+"");
    console.log("gpunet.js -- GPUNetRender, circle[" + iN + "] located " + printV(compute_circle_center_loc(graph_buffers, iN),iN) + " -- commence submit!" );
  }
  //commandBuffer2 = encoder2.finish();
  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
  if (vb >= 1) {
    console.log("GPUNetRender, the command should have submitted: print is " + num_prints);
    //if (num_prints >= 100) {
    //  debugger;
    //}
  }
  //console.log("GPURender -- We have submitted draw command to device.");
  return({"gpu_object":"running_widget"});
}

function generatePipeline(device, module) {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const pipeline = device.createRenderPipeline({
    label: 'Rendering Graph Network',
    layout: 'auto',
    vertex: {
      entryPoint: 'vs',
      module,
    },
    fragment: {
      entryPoint: 'fs',
      module,
      targets: [{ format: presentationFormat }],
    },
  });
  return(pipeline);
}
function Clear_Screen_RenderPass() {
 const renderPassDescriptor = {
    label: 'White Background RenderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        clearValue: [.9, .9, .9, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };  
  return(renderPassDescriptor);
}

const getvX4 = (gnb) => (idx) => {
  return([gnb[idx*4], gnb[idx*4+1], gnb[idx*4+2],gnb[idx*4+3]]);
}
const vF = (view_mat) => (vX) => {
  return(m4v4mul(view_mat,vX));
}
// Strange x = (a,b)=>(c)=>{return(a+b+c); };
// Sometimes this works, sometimes it doesnt
function info_graph_text(this_camera, this_gpuwidget) {
  const eye = this_camera.st_camera.eye; const center = this_camera.st_camera.center; const up = this_camera.st_camera.up;
  const theta = this_camera.st_camera.theta; const phi = this_camera.st_camera.phi;
  const c_getvX4 = getvX4(this_gpuwidget.tgpu.graph_buffers.graph_node_buffer);
  const c_vF = vF(this_camera.st_camera.view); const c2_vF = vF(this_camera.st_camera.projection);
  const cpj_vF = vF(this_camera.st_camera.permapj);
  let vX = c_getvX4(0);  const pos0 = c_vF(vX); const ppos0 = c2_vF(pos0); const alt_ppos0 = cpj_vF(vX);
  vX = c_getvX4(1);      const pos1 = c_vF(vX); const ppos1 = c2_vF(pos1);
  vX = c_getvX4(2);      const pos2 = c_vF(vX); const ppos2 = c2_vF(pos2);
  vX = c_getvX4(3);      const pos3 = c_vF(vX); const ppos3 = c2_vF(pos3);
  vX = c_getvX4(4);      const pos4 = c_vF(vX); const ppos4 = c2_vF(pos4);
  vX = c_getvX4(5);      const pos5 = c_vF(vX); const ppos5 = c2_vF(pos5);
  const right = this_camera.right;  const front = this_camera.front;
  const pj = this_camera.st_camera.permapj;
  const pr = this_camera.st_camera.projection;
  const vw = this_camera.st_camera.view;
  const r = Math.exp(this_camera.st_camera.distance);
  function fS(v,d) { let sm = 0; for (let i = 0; i < 3; i++) { sm = sm + ( v[i]-d[i]) * (v[i]-d[i]) }
                         return (sm); } 
  const eyeD = Math.sqrt(fS(this_camera.st_camera.eye, this_camera.st_camera.center));
  //`:w
  //debugger;
  function p3me(nm,pos) {
    return(nm+"=[" + trD(pos[0],2) + "," + trD(pos[1],2) + "," + trD(pos[2],2) +"]"  );
  }
  function ppt(pos,i) { 
    return("pos"+i + "=[" + trD(pos[0],2) + "," + trD(pos[1],2) + "," + trD(pos[2],2) + "," + trD(pos[3],2) + "] "  );
  }
  function pppt(pos,i) { 
    return("ppos"+i + "=[" + trD(pos[0],2) + "," + trD(pos[1],2) + "," + trD(pos[2],2) + "," + trD(pos[3],2) + "] " + in_or_out(pos) );
  }
  function in_or_out(ppos) {
    if ( (ppos[0] / ppos[3] < -1.0) || (ppos[0]/ppos[3] > 1.0)) { return("out[x]") }
    if ( (ppos[1] / ppos[3] < -1.0) || (ppos[1]/ppos[3] > 1.0)) { return("out[y]") }
    if ( (ppos[2] / ppos[3] <  0) ) { return("out[-z]"); }
    if  (ppos[2]/ppos[3] > 1.0) { return("out[+z]") }
    return("in");
  } 
  function pm4(nm,mx) {
    return(nm + "\n[" + trD(mx[0],2) + "," + trD(mx[4],2) + "," + trD(mx[8],2) + "," + trD(mx[12],2) + "]\n" + 
                  "[" + trD(mx[1],2) + "," + trD(mx[5],2) + "," + trD(mx[9],2) + "," + trD(mx[13],2) + "]\n" + 
                  "[" + trD(mx[2],2) + "," + trD(mx[6],2) + "," + trD(mx[10],2) + "," + trD(mx[14],2) + "]\n" + 
                  "[" + trD(mx[3],2) + "," + trD(mx[7],2) + "," + trD(mx[11],2) + "," + trD(mx[15],2) + "]\n")
  }
  const wtext =   ("gpunet->info_graph_text() \n eye=[" + trD(eye[0],2) + "," + trD(eye[1],2) + "," + trD(eye[2],2) + "], near=" +trD(this_camera.st_camera.near,2) + 
                                            ", far=" + trD(this_camera.st_camera.far,2) + ", fovy=" + trD(this_camera.st_camera.fovy,2) + " \n " +
                                             p3me("skew_nodes", skn) + "\n" + 
                                             "center=[" + trD(center[0],2) +"," + trD(center[1],2) + "," + trD(center[2],2) + "], " + 
                                             "distance=" + trD(this_camera.st_camera.distance,2) + ", eyeD=" + trD(eyeD,2) + " \n " + 
                                             "ddistance=" + trD(this_camera.ddistance,2) + ", minDistance=" + trD(this_camera.minDistance,2) + 
                                             "maxdistance=" + trD(this_camera.maxDistance,2) + "\n" + 
                                             "up=[" + up[0] + "," + trD(up[1],2) + "," + trD(up[2],2)+ "] \n " + 
                                             "right=[" + trD(right[0]) + "," + trD(right[1],2) + "," + trD(right[2],2)+ "] \n " + 
                                             "front=[" + trD(up[0]) + "," + trD(front[1],2) + "," + trD(front[2],2)+ "] \n " 
                                             +"theta=" + trD(theta,3) + ", phi= " + trD(phi,3)  + " \n "
                                             +" r = " + trD(r,3) + ", distance = " + this_camera.st_camera.distance +",\n"
                                             +" this.ddistance = " + trD(this_camera.ddistance,3) + ", for num nodes: " + 
                                                      this_gpuwidget.tgpu.graph_buffers.graph_nodes.length +", \n" 
                                             +"pos0=[" + trD(pos0[0],2) + "," + trD(pos0[1],2) + "," + trD(pos0[2],2) + "," + trD(pos0[3],2) + "] \n"
                                             + ppt(pos1,1) + "\n"
                                             + ppt(pos2,2) + "\n"
                                             + ppt(pos3,3) + "\n"
                                             + ppt(pos4,4) + "\n" + ppt(pos5,5) + "\n" 
                                             +"RED=" + pppt(ppos0,0) + "\n"
                                             +"ALT_RED" + pppt(alt_ppos0,0) + "\n"
                                             +"PINK=" + pppt(ppos1,1) + "\n" 
                                             +"BLUE=" + pppt(ppos2,2) + "\n"
                                             + "ORANGE=" + pppt(ppos3,3) + "\n" 
                                             + "GREEN=" + pppt(ppos4,4) + "\n" + "PURPLE" + pppt(ppos5,5) + "\n" 
                       + pm4("permapj", pj) + "" 
                       + "projection = \n[" + trD(pr[0],2) + "," + trD(pr[4],2) + "," + trD(pr[8],2) + "," + trD(pr[12],2) + "] \n" 
                       + "           " + trD(pr[1],2) + "," + trD(pr[5],2) + "," + trD(pr[9],2) + "," + trD(pr[13],2) + "] \n"
                       + "           " + trD(pr[2],2) + "," + trD(pr[6],2) + "," + trD(pr[10],2) + "," + trD(pr[14],2) + "] \n" 
                       + "           " + trD(pr[3],2) + "," + trD(pr[7],2) + "," + trD(pr[11],2) + "," + trD(pr[15],8) + "] \n" 
                       + "view = \n[" + trD(vw[0],2) + "," + trD(vw[4],2) + "," + trD(vw[8],2) + "," + trD(vw[12],2) + "] \n" 
                       + "           " + trD(vw[1],2) + "," + trD(vw[5],2) + "," + trD(vw[9],2) + "," + trD(vw[13],2) + "] \n"
                       + "           " + trD(vw[2],2) + "," + trD(vw[6],2) + "," + trD(vw[10],2) + "," + trD(vw[14],2) + "] \n" 
                       + "           " + trD(vw[3],2) + "," + trD(vw[7],2) + "," + trD(vw[11],2) + "," + trD(vw[15],8) + "] \n" 
                      +"");

  return(wtext);
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
const blank_main = function(gpucontext, device) {
  //console.log("gpunet.js -- GPUNetRender():  We are starting");
  console.log("gpunet.js -- blank_main is called gettint texture");
  const texture = gpucontext.getCurrentTexture();
  const view = texture.createView(); 
  //console.log("gpunet.js -- GPUNetRender(): Camera Generate"); 
  //gpucamera = new lib_camera.gl_camera();
  //console.log("gpunet.js -- renderpass generate");
  const encoder = device.createCommandEncoder({ label: 'GPUNet encoder generated to do render pass' });
  console.log("gpunet.js -> blank_main -- we have executed");
  let blank_rpd = Clear_Screen_RenderPass();
  blank_rpd.colorAttachments[0].view =
        gpucontext.getCurrentTexture().createView();
  const pass_encoder = encoder.beginRenderPass(blank_rpd);
  pass_encoder.end();

  const command_buffer = encoder.finish();
  device.queue.submit([command_buffer]);
}
const gpuexports = {
   Clear_Screen_RenderPass:Clear_Screen_RenderPass, generatePipeline:generatePipeline,
   graph_nodes:graph_nodes, circle_vertices:circle_vertices, circle_elements:circle_elements, line_vertices:line_vertices,
   generateGraphNodesModule: generateGraphNodesModule, gpu_init_glnet_buffers:gpu_init_glnet_buffers,
   GPUNetPipeline:GPUNetPipeline,  create_edgebindGroup:create_edgebindGroup,
   GPUNetRender:GPUNetRender, graph_buffers:graph_buffers,
   permaprojection:permaprojection, 
   blank_main:blank_main, compute_circle_plot_loc:compute_circle_plot_loc, m4v4mul:m4v4mul, 
   default_graph_setup:default_graph_setup, update_uniform_device_buffer:update_uniform_device_buffer,
   create_uniform_device_buffer:create_uniform_device_buffer, info_graph_text:info_graph_text,
   network_data: network_data, default_center: default_center
}
exports = gpuexports;
module.exports = gpuexports;

