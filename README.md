# ```gpugraphwidget```

- A WebGPU Structure Project -- testing ability to do 3D rotational graph networks in WebGPU

- Alan Lenarcic, study project

- Version .01 (2025-06-23)

 Working deployment, studying features of webGPU and Anywidget and considering designs for 3D plotting and potentially OpenGPU mathematics.

 A basic 3D rotational graph in Jupyter notebook space

 Of course, one probably needs fructerman or other GL capabilities to plot this graph.


# License
 Open source Javascript (in altered form in static/altered_lib and in less altered form in static/external_lib) remains licensed according
 to wishes of the original authors.

 Original code (in static/internal_lib as well as widget_src/) is GPLv2 licensed (with a strong recommendation that readers consider
implementing their own code).  Some of this code is adapted from techniques recommended in WebGPUFundamentals and the Anywidget readmes to
access the respective WebGPU and Anywidget libraries.
 
## gpugraphwidget
 
  An effort to recode REGL projects in straight WebGPU and experiment in jupyter notebooks.

  While REGL is a powerful tool, it's compatibility with "anywidget" appears to leave more to be desired.  
  Anywidget itself creates a path which makes it difficult to determine how often refreshes of the REGL frame are
  being called, and this creates images that fade away.  Implementation of the same functionality in straight WebGPU
  exposes some of the relationships with which anywidget and jupyter notebooks call for redraws and wipes of GPU content.

  An attempt to take control of this by modularizing code in our own way is required.  Over the course of time
  it was converted to a WebGPU implementation using adapted code in the graph.  We are using an "Anywidget"
  functionality which allows for update of the javascript space from python calls.

  Alan Lenarcic 2025.04.03

## Contents:
  widget_src/widget_index.js -- Anywidget interface.  Calling ESBuild on this file builds an entire version of widget
  static/internal_lib/ : Self Written code
     gpuwidget.js: General code for a "3D" graph where the nodes are depicted by cirlces and edges are largely overlayed.
     gpunet.js: The Network/Graph visualization
     hellogpu.js: a more simple test of 2d graphics capabilities of WebGPU device
  static/altered_lib: Libraries formerly written for WebGL we have modified and changed for WebGPU.
    mat_alt4.js: Matrix operations for using Cameras (including self-built adaptions of LookAt for quaternion based estimation)
    gl_camera.js: Changing REGL's camera library to deal with WebGPU parameters
      (example: View and Perspective must rely on z scale from 0 to 1, alternate methodologies for drawing new frame)
  static/external_lib: Copies of external JS that could be returned from versions online.
  
     
  static/adaptived

## Using the package
## 
## Goal of the package is to create quick demo of WebGPU running inside an "anywidget" in a Jupyternotebook
##
## This has been more difficult than expected, thanks to discontinuation of WebGL and evolving nature of WebGPU

To Run
1. Have a environment with "esbuild",  Build the Javascript using the command in ```setup.md``` file altered to target directory
2. Run Jupyter notebook
3. Run the first square, see if you have a rotating axis.
4. Plenty still to debug (2025-06-23).  We can efficiently rotate the 3d object, but our calculation of Z window is wrong.


# Content of the package

 The package places points in a simple 3D graph space, including a connection between these nodes.
 Then it demonstrates Camera and View matrices that help map objects in arbitrary 3D space to the 2D canvas.

 All nodes are simple single color circles (in 2D, always oriented at the viewer).  All edges are simple parallelograms
 which should always be plotted behind nodes.  Rotation of the 3D space brings some nodes in front of others, and we use
 a camera similar to what is available in REGL, with the nodes centered around (0,0,0), and the camera initially at a point
 (0,0,h) and rotating around that center point based upon look rotations. 

# Building with batteries included

 We have altered several OpenGL based libraries to deal with the changed camera operations we desire.  We are also altering
many open source JS libraries (around mouse look and matrices) so that a single require-based build using esbuild combines
the necessary packages together into a jupyter notebook.  We also hope to display this visual in a FastAPI driven application. 

As this is a demonstration implementation of WebGPU-displayed 3D graphs, we don't expect this to be performant, and much
 console.log() expressions need to be removed that affect performance, but demonstrate the geometric features used in the
 implementation.
