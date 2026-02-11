const exports = { 
  graph_nodes: [ [0.0,0.0, 0.0], [1.0,0.0,0.0], [-1.0,0.0,0.0], 
    [0.0,1.0, 0.0], [0.0,0.0,1.0], [ 0.0,2.0,0.0],
    [0.0,0.0,-1.0], [0.0,3.0,0.0], [ 0.0,0.0,0.0]],
  
  graph_edges: [ [0,1],[0,2],[0,3],[0,4],[3,5],[0,6],[5,7], [1,8],[2,8],[3,8],[4,8],[6,8],[7,5], [0,8],[8,1],[8,2] ],
  center: [0,0,0],
  skew_nodes:[0,0,3],
  make_skewed: function(gn,sn) {
   let nn = [];
   for (let ii = 0; ii < gn.length;ii++) {
     nn.push([(gn[ii])[0] + sn[0], (gn[ii])[1] + sn[1], (gn[ii])[2] + sn[2]]);
   }
   return(nn);
  }
}

module.exports = exports;
