////////////////////////////////////////////////////////////////////////////
// hellogpu.js -- Adapted from WebGPU intro by Alan Lenarcic
//
//
// HelloWorld example from https://webgpufundamentals.org/webgpu/lessons/webgpu-fundamentals.html
// 1. Create Module with Vertex and fragment functions in same codes:
//
// The following tests information found in webgpufundamentals, and basically implements very
// simple 2D shapes that can be rendered by the GPU into a HTML canvas object.
//
// Note, plotting a basic triangle with WebGPU can be rather difficult, as the various
//  device and pipeline requirements begin to add up.
//
// Techniques proven here will be used in the 3D widget.
var pexports = {}

// Replace Triangle with Circles
const get_circle_vertices = function(rs, ns) {
    let points = [];
    // For fun we are missing last 2 triangles, so we can see rotation
    let thet0 = (3/2) * Math.PI;
    for (let i = 0; i < (ns/2)-2; i++) {
      let thet1 = ((2*(i+1)/ns)) * Math.PI;
      let thet2 = ((2*(i+2)/ns)) * Math.PI;
      points.push([rs * Math.cos(thet0), rs * Math.sin(thet0), 0.0 ] );
      points.push([rs * Math.cos(thet0+thet1), rs * Math.sin(thet0+thet1), 0.0 ] );
      points.push([rs * Math.cos(thet0+thet2), rs * Math.sin(thet0+thet2), 0.0 ] );
      points.push([rs * Math.cos(thet0), rs * Math.sin(thet0), 0.0 ] );
      points.push([rs * Math.cos(thet0-thet1), rs * Math.sin(thet0-thet1), 0.0 ] );
      points.push([rs * Math.cos(thet0-thet2), rs * Math.sin(thet0-thet2), 0.0 ] );
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
const circle_vertices = get_circle_vertices(.2,24);
const circle_elements = get_circle_elements(.2,12);


// attrs lets put in a storage buffer
//const basic_attrs = [ {ma:1.0, rot: [1.0,0.0,0.0,1.0], tr: [.3,.3]},
//          {ma: 1.2, rot:[-1.0,0.0,0.0,-1.0], tr: [-0.3,-.3]},
//          {ma: .8, rot:[3/5,4/5,-4/5,3/5], tr: [0.3,-.4]} ];

const basic_attrs = [ {rot: [0.0,1.0,1.0,0.0], tr: [.25,.4],ma:1.0},
          {rot:[-1.0,0.0,0.0,-1.0], tr: [-0.25,-.4],ma:1.5},
          {rot:[3.0/5.0,4.0/5.0,-4.0/5.0,3.0/5.0], tr: [0.25,-.4],ma:.5} ];
function create_basic_attr_buffer(device) {
   const attrBufferVecSize = 2 * 4 + 4 * 4 + 2 * 4;
   const attrBufferTotalSize = attrBufferVecSize * basic_attrs.length;
   const cur_attr_value = new Float32Array(attrBufferVecSize / 4);
   const attr_Buffer = device.createBuffer({ label: 'Circle Location Attributes',
    size: attrBufferTotalSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
   });
   for (let i = 0; i < basic_attrs.length; i++) {
     cur_attr_value.set(basic_attrs[i].tr,0);
     cur_attr_value.set([basic_attrs[i].ma],6);
     cur_attr_value.set(basic_attrs[i].rot,2);
     device.queue.writeBuffer(attr_Buffer, attrBufferVecSize * i, cur_attr_value); 
   }
   console.log("create_basic_attr: cur_attr_value is now");
   console.log(cur_attr_value);
   return(attr_Buffer);
}
// Note that Vertex buffer appears to fail
function create_basic_vertex_buffer(device) {
   const vertexBufferVecSize = 2 * 4;
   const vertexBufferTotalSize = vertexBufferVecSize * circle_vertices.length;
   const spread_vertices = new Float32Array( vertexBufferTotalSize / 4);
   console.log("create_basic_vertex_buffer, populating the spread_vertices table: circle_vertices.length is " + circle_vertices.length);
   for (let i = 0; i < circle_vertices.length; i++) {
     console.log("writing circle virtices length[" + circle_vertices[i].length +  "] i="+ i + ", [" + circle_vertices[i].join(",") + "] spread_vertices length " + spread_vertices.length);
     spread_vertices.set( [ (circle_vertices[i])[0], (circle_vertices[i])[1] ], i * 2); // spread out buffer
   }
   const vertex_Buffer = device.createBuffer({ 
    label: 'Circle Vertex Locations',
    size: vertexBufferTotalSize,
    //usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
   });
   console.log("create_basic_vertex_buffer about to write to vertex_Buffer location, spread_vertices is length " + 
     spread_vertices.length + " and vertex_Buffer is length " + vertexBufferTotalSize);
   device.queue.writeBuffer(vertex_Buffer, 0, spread_vertices);
   return(vertex_Buffer);
}

function HelloWorldModule(device) {
  console.log("Running a new basic triangle Fragment/Vertex Web GPU triangle"); 
  if (!("createShaderModule" in device)) {
    console.log("HelloWorldModule: Error the module is missing.");
    debugger;
  }
  const Hello_Code = `
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
        let pos = array(
           vec2f( 0.0,  0.5),  // top center
           vec2f(-0.5, -0.5),  // bottom left
           vec2f( 0.5, -0.5)   // bottom right
          );
 
        return vec4f( pos[vertexIndex], 0.0, 1.0);
      }
 
      @fragment fn fs() -> @location(0) vec4f {
        return vec4f(0.0, 0.5, .7.0, 1.0);
      }
    `;
  const Advanced_Code = `
      struct VS_Uniforms_0 {
        tr: vec2f
      };
      struct InputVertex {  vertex_point: vec2f };
      struct Attr_1 {
        @location(0) tr: vec2f,
        @location(1) rot0: vec2f,
        @location(2) rot1: vec2f,
        @location(3) ma: vec2f 
      //@location(0) ma: f32,
      //@location(1) rot0: vec2f,
      //  //@location(2) rot1: vec2f,
      //  //@location(3) tr: vec2f
      };
      //@group(0) @binding(0) var<uniform> u0: VS_Uniforms_0;
      @group(0) @binding(0) var<storage, read> v_vert: array<InputVertex>;
      @group(0) @binding(1) var<storage, read> v_attr: array<Attr_1>;
      @group(0) @binding(2) var<uniform> u0: VS_Uniforms_0;
      // output
      struct VSO_0 {
        @builtin(position) position: vec4f,
        @location(0) color:vec4f,
      };
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex: u32,
        @builtin(instance_index) instanceIndex: u32
        //@builtin(instance_index) instanceIndex: u32
      //) -> @builtin(position) vec4f {
      ) -> VSO_0 {
        var vsOut: VSO_0;
        let va = v_attr[instanceIndex];
        let input_vert = v_vert[vertexIndex];
        var rot = mat2x2f(va.rot0[0],va.rot0[1],va.rot1[0],va.rot1[1]);
        //rot = mat2x2f(1.0,0.0,0.0,1.0);
        //(rot[0]).x = va.rot0[0];  (rot[1])[1] = va.rot0[1];
        //(rot[1]).x = va.rot1[0];  (rot[1]).y = va.rot1[1];
        //rot = mat2x2f(3.0/5.0,4.0/5.0,-4.0/5.0,3.0/5.0);
        //vsOut.position = vec4f( ((0.0*va.ma+1.0)*(rot*input_vert.vertex_point))*0.0 + input_vert.vertex_point + va.tr, 0.0, 1.0);
        vsOut.position = vec4f( va.ma[0] * rot*(input_vert.vertex_point) + va.tr  + vec2f(0.0,0.0) + u0.tr, 0.0, 1.0);
        //var vpos = vec4f(0.0,0.0,0.0,0.0);
        //if (vertexIndex % 3 == 0) {
        //  vpos = vec4f(vec2f(0.0,0.5)+u0.tr,0.0,0.0);
        //} else if (vertexIndex % 3 == 1) {
        //  vpos = vec4f(vec2f(0.5,-.25)+u0.tr, 0.0,0.0);
        //} else {
        //  vpos = vec4f(vec2f(-0.5,-.25)+u0.tr,0.0,0.0);
        //}
        //vsOut.position = vpos;
        vsOut.color = vec4f(0.0,0.5,1.0,1.0);
        return(vsOut);
      }
 
      @fragment fn fs(vsOut:VSO_0) -> @location(0) vec4f {
        return vec4f(0.0, 0.5, 1.0, 1.0);
      }
  `;
  const module = device.createShaderModule({
    label: 'our hardcoded red triangle shaders',
    //code: Hello_Code,
    code: Advanced_Code
  });
  return(module);
}
pexports.HelloWorldModule = pexports;


// 2. Create Pipeline
function HelloWorldPipeline(device, module) {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const pipeline = device.createRenderPipeline({
    label: 'our hardcoded red triangle pipeline',
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
pexports.HelloWorldPipeline = HelloWorldPipeline;
function VertexHelloWorldPipeline(device, module) {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const pipeline = device.createRenderPipeline({
    label: 'our hardcoded red triangle pipeline',
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
pexports.VertexHelloWorldPipeline = VertexHelloWorldPipeline;
// 3. Create Render Pass
function HelloWorldRenderPass() {
 const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        clearValue: [0.9, 0.9, 0.9, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };  
  return(renderPassDescriptor);
}
pexports.HelloWorldRenderPass = HelloWorldRenderPass;
// Buffers
// The uniform variables will just be [.1,.1] transposition
const uniform0_buffer_size = 2*4; // 2 32 bit floats:
function create_uniform0_Buffer(device) {
  console.log("create_Uniform0_Values() called");
  // Note Toy values for uniform
  const uniform0_Values = new Float32Array(uniform0_buffer_size / 4);
  uniform0_Values.set([.1,-.3],0);
  console.log("create_Uniform0, uniform0_Values is :");
  console.log(uniform0_Values);
  const u0_buffer = device.createBuffer({ size: uniform0_buffer_size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
  device.queue.writeBuffer(u0_buffer, 0, uniform0_Values);
  return(u0_buffer);
}
function create_bindGroup(device,pipeline,uniform_buffer0, attr_buffer1, vertex_buffer2) {
  /*
  const our_bindgroup = device.createBindGroup({
    label: "BindGroup Created for two bindings",
    layout:  pipeline.getBindGroupLayout(0),
    entries: [
     {binding:0, resource: {buffer: uniform_buffer0} },
     {binding:1, resource: {buffer: vertex_buffer2} }
    ],
    });
  */
  const our_bindgroup = device.createBindGroup({
    label: 'bind group for objects',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: vertex_buffer2 }},
      { binding: 1, resource: { buffer: attr_buffer1 }},
      { binding: 2, resource: { buffer: uniform_buffer0}}
    ],
  });
  console.log("create_uniform0_buffer -- writing uniform0_Values to buffer");
  return(our_bindgroup);
}

// 4. General Render Path for Web GPU
function GeneralRenderPath(renderPassDescriptor, device) {
    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture().createView();
 
    // make a command encoder to start encoding commands
    const encoder = device.createCommandEncoder({ label: 'our encoder' });
 
    // make a render pass encoder to encode render specific commands
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.draw(3);  // call our vertex shader 3 times
    pass.end();
 
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}
pexports.GeneralRenderPath = GeneralRenderPath;

function HelloWorldRender(gpucontext, adapter, device) {
  console.log("hellogpu.js -- HelloWorldRender():  We are starting");
  
  console.log("hellogpu.js -- renderpass generate");
  const rpd = HelloWorldRenderPass();

  console.log("hellogpu.js -- World Module generate");
  const module = HelloWorldModule(device)

  console.log("hellogpu.js -- HelloWorld Pipeline generate");
  const pipeline = VertexHelloWorldPipeline(device, module); 

  // Get the current texture from the canvas context and
  // set it as the texture to render to.
  //
  console.log("hellogpu.js -- we are cerating the view");
  rpd.colorAttachments[0].view =
        gpucontext.getCurrentTexture().createView();
 
  // make a command encoder to start encoding commands
  const encoder = device.createCommandEncoder({ label: 'our encoder' });

  console.log("hellogpu.js -- binding the uniforms to the pipeline");
  const uniform_buffer0 = create_uniform0_Buffer(device);
  const attr_buffer1 = create_basic_attr_buffer(device);
  const vertex_buffer2 = create_basic_vertex_buffer(device);
  const our_bindgroup = create_bindGroup(device, pipeline, uniform_buffer0, attr_buffer1, vertex_buffer2);
  console.log("hellogpu.js -- bindgroup is generated");

  // make a render pass encoder to encode render specific commands
  console.log("hellogpu.js -- render pass begin");
  const pass = encoder.beginRenderPass(rpd);
  console.log("hellogpu.js -- setting pipeline");
  pass.setPipeline(pipeline);
  console.log("hellogpu.js -- setting vertex buffer -- note vertex buffers and storage buffers appear to not work together");
  //pass.setVertexBuffer(0, vertex_buffer);
  console.log("hellogpu.js -- setting bindgroup");
  pass.setBindGroup(0, our_bindgroup);
  console.log("hellogpu.js -- about to call draw call: bassic_attrs length is " + basic_attrs.length + ", cv length " + circle_vertices.length);
  //pass.draw(basic_attrs.length, circle_vertices.length);  // call our vertex shader 3 times (if function is (3))
  //debugger;
  pass.draw(circle_vertices.length, basic_attrs.length);  // call our vertex shader 3 times (if function is (3))
  pass.end();
 
  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  return({"gpu_object":"running_widget"});
}
function blank_main() {
  console.log("hello.js -- blank_main is called.");
  return(1);
}
pexports.HelloWorldRender = HelloWorldRender;
pexports.blank_main = blank_main;
exports = pexports;
module.exports = pexports;
