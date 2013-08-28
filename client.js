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
    // when out of range, mult=7
    var depthVal = bytearray[2*i]+bytearray[2*i+1]*255;
    var x = i % width;
    var y = Math.floor(i / width);
    dataArray[x][y] = depthVal;
  }
  return dataArray;
}

function renderCanvas(dataArray){
  var imgdata = ctx.getImageData(0,0, width, height);
  for(var i=0; i<width; i++){
    for(var j=0; j < height; j++){
      var index = j*width + i;
      var depth = dataArray[i][j]/5;
      imgdata.data[4*index] = depth;
      imgdata.data[4*index+1] = depth;
      imgdata.data[4*index+2] = depth;
      imgdata.data[4*index+3] = 255;
    }
  }
  ctx.putImageData(imgdata,0,0);
}


var websocket = require('websocket-stream');
var socket = websocket('ws://localhost:3000');
console.log("connected");

var width = 640;
var height = 480;
var ctx = document.getElementById('canvas').getContext('2d');

//loop
socket.on('data', function (data) {
  var bytearray = new Uint8Array(data);
  var dataArray = getDataArray(bytearray);
  renderCanvas(dataArray);
});

socket.on('end', function(){
  console.log("stream ended");
});



