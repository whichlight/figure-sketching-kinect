function createArray(length) {
  var arr = new Array(length || 0),
      i = length;
  if (arguments.length > 1) {
    var args = Array.prototype.slice.call(arguments, 1);
    while(i--) arr[length-1 - i] = createArray.apply(this, args);
  }
  return arr;
}

function getDataArray(bytearray){
  var dataArray = createArray(width,height);
  for(var i=0;i<bytearray.length/2;i++){
    //for depth feed  . bytearray  [val , mult, val2, mult2, ...]
    // when out of range, mult=7. range (0-255, 0-7)
    var depthVal = bytearray[2*i]+bytearray[2*i+1]*255;
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
}

function processArray(arr){
  var res = createArray(width,height);
  for(var i=0; i< width; i++){
    for(var j=0; j < height-1; j++){
      if(arr[i][j]-arr[i][j+1]<0.5){
        res[i][j] = 200;
      }
    }
  }
  return res;
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

//initThreeJS();
//renderThreeJS();
//loop

socket.on('data', function (data) {
  var bytearray = new Uint8Array(data);
  var dataArray = getDataArray(bytearray);
  renderArrayToCanvas(processArray(dataArray));
});


socket.on('end', function(){
  console.log("stream ended");
});
