The directories here are the key operational javascript code.

External code (inlcuding alterations) is open source with respect to the original authors intentions.

The internal libraries are GPUv2 licensed, but users should understand they are only at demonstration quality, and designed
 for teaching, not necessarily ready for production libraries.

1. external_lib: largely External copies of existing popular Javascript libraries, as noted.  Minor changes to support esbuild/require were adapted.
  Almost all libraries come from standard implementation of the "REGL" bunny, which is a rotation 3D visualization of a common 3D bunny.


2. altered_lib: more significant alterations have been done to these libraries to identify issues with 3D plotting, and to diagnose incompatibilities
  between anywidget and the steps of REGL/WebGPU plotting.

3. internal_lib: library functions written largely from scratch for this demonstration.  These include the functions calling WebGPU.


Together these libraries demonstrate:

1. How to get a 3D WebGPU widget running in jupyter-notebooks.

2. How to debug a 3D rotational graph.

3. How to project 2D objects onto a 3D rotational space to simply computations and hopefully scale up to efficient depictions of larger graphs.
