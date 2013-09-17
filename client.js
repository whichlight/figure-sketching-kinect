function renderArrayToCanvas(arr){
  for(var i=0;i<arr.length;i++){
    var depth = arr[i];
    imgdata.data[4*i] = arr[i];
    imgdata.data[4*i+1] = depth;
    imgdata.data[4*i+2] = depth;
    imgdata.data[4*i+3] = 255;
  }
  ctx.putImageData(imgdata,0,0);
}

var websocket = require('websocket-stream');
var socket = websocket('ws://localhost:3000');
console.log("connected");

var width = 640;
var height = 480;
var ctx = document.getElementById('canvas').getContext('2d');
var imgdata = ctx.getImageData(0,0, width, height);

socket.on('data', function (data) {
    var bytearray = new Uint8Array(data);
    renderArrayToCanvas(bytearray);
    });

socket.on('end', function(){
    console.log("stream ended");
    });


