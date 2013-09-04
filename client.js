function createArray(length) {
  var arr = new Array(length || 0),
      i = length;
  if (arguments.length > 1) {
    var args = Array.prototype.slice.call(arguments, 1);
    while(i--) arr[length-1 - i] = createArray.apply(this, args);
  }
  return arr;
}

function getDepthArray(bytearray){
  var dataArray = createArray(width,height);
  for(var i=0;i<bytearray.length;i++){
    var depthVal = bytearray[i];
    var x = i % width;
    var y = Math.floor(i / width);
    dataArray[x][y] = depthVal;
  }
  return dataArray;
}

function renderArrayToCanvas(arr){
  var imgdata = ctx.getImageData(0,0, width, height);
  for(var i=0; i<width; i++){
    for(var j=0; j < height; j++){
      var index = j*width + i;
      var depth = arr[i][j];
      imgdata.data[4*index] = depth;
      imgdata.data[4*index+1] = depth;
      imgdata.data[4*index+2] = depth;
      imgdata.data[4*index+3] = 255;
    }
  }
  ctx.putImageData(imgdata,0,0);
  in_processing = false;
}


function initThreeJS() {
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.position.z = 10;
  scene = new THREE.Scene();
  for(var i=0; i<10; i++){
    for(var j=0; j<10; j++){
      var geometry = new THREE.CubeGeometry(1,1,1);
      var material = new THREE.MeshBasicMaterial( { color: 0xff0000} );
      var mesh = new THREE.Mesh( geometry, material );
      scene.add( mesh );
      vertices.push( new THREE.Vector3(i, j, i ));
    }
  }
  //geometry = new THREE.Geometry();
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight);
  $("#container").append( renderer.domElement );
}

function renderThreeJS(){
  requestAnimationFrame(renderThreeJS);
  renderer.render( scene, camera );
}


var websocket = require('websocket-stream');
var socket = websocket('ws://localhost:3000');
console.log("connected");

var width = 640;
var height = 480;
var ctx = document.getElementById('canvas').getContext('2d');

var camera, scene, renderer;
var geometry, material, mesh;
var vertices = [];
var in_processing = false;

//initThreeJS();
//renderThreeJS();
//loop

socket.on('data', function (data) {
  if(!in_processing){
    in_processing = true;
    var bytearray = new Uint8Array(data);
    var dataArray = getDepthArray(bytearray);
    renderArrayToCanvas(dataArray);
  }
});


socket.on('end', function(){
  console.log("stream ended");
});
