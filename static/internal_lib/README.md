# Internal Library code.

Code here is originally written by Alan Lenarcic, using recommendations in WebGPUFundamentals and Anywidget documentation to access those libraries.

It can be considered GPLv2 licensed, and is of demonstration/testing quality.

1. hello_gpu.js, test_gl.js
  These are merely hello-world level tests to make sure the WebGPU canvas can be accessed and basic triangles can be plotted.

2. gpuwidget.js
   Creates a gpuwidget class, as recommended in anywidget, which will render at a certain rate.

3. gpunet.js
  Calls WebGPU code including device, pipeline, and actual module code written in WebGL.

4. glwidget.js,glnet.js
  Attempts previously to use Regl and OpenGL to do this plot.  (note, it can be difficult to interact Anywidget calls with
  Regl libraries, though there are a few examples online where the two libraries call each other.
