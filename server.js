var app = require('http').createServer(handler).listen(3000)
, fs = require('fs')
, kinect = require('kinect')
, BufferStream = require('bufferstream')
, $ = require('jquery')
, WebSocketServer = require('ws').Server
, websocket = require('websocket-stream')
, wss = new WebSocketServer({server: app});

function handler (req, res) {
  if(req.url === "/"){
    fs.readFile(__dirname + '/index.html',
        function (err, data) {
          if (err) {
            res.writeHead(500);
            return res.end('Error loading index.html');
          }
          res.writeHead(200);
          res.end(data);
        });
  }
  else{
    fs.readFile(__dirname + req.url, function (err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading ' +req.url);
      }
      res.writeHead(200);
      res.end(data);
    });
  }
}

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

function getBufferFromArray(arr){
  var buf = new Buffer(width*height);
  for(var i=0; i<width; i++){
    for(var j=0; j <height; j++){
      var index = j*width + i;
      buf[index] = arr[i][j];
    }
  }
  return buf;
}

function processArray(arr){
  var res = createArray(width,height);
  for(var i=0; i< width; i++){
    for(var j=0; j < height-1; j++){
      if(arr[i][j]-arr[i][j+1]>0.9){
        res[i][j] = 255;
      }
    }
  }
  return res;
}


var kcontext = kinect();
var width = 640;
var height = 480;


kcontext.resume();
kcontext.start('depth');
var kstream = new BufferStream();

kcontext.on('depth', function (buf) {
  var bytearray = new Uint8Array(buf);
  var dataArray = getDataArray(bytearray);
  var buffer = getBufferFromArray(processArray(dataArray));
  kstream.write(buffer);
});


wss.on('connection', function(ws) {
  var stream = websocket(ws);
  kstream.pipe(stream);
  console.log("connection made");
  ws.on('close', function() {
    stream.writable=false;
    console.log('closed socket');
  });

});



