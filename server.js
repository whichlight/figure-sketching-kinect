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
    var depthVal = bytearray[2*i]+bytearray[2*i+1]*256;
    var x = i % width;
    var y = Math.floor(i / width);
    dataArray[x][y] = depthVal;

    //distance threshold
    if(depthVal>973){

   // if(depthVal>2000){
      dataArray[x][y]=0;
    }
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
  for(var i=0; i< width-1; i++){
    for(var j=0; j < height-1; j++){
      var diffy = Math.abs(arr[i][j]-arr[i][j+1]);
      var diffx = Math.abs(arr[i][j]-arr[i+1][j]);
      if((diffy>1 || diffx>1)){
        res[i][j] = Math.max(diffy,diffx)*2+240;
      }
      else{
        res[i][j] = 0;
      }
    }
  }
  return res;
}


function mode(array)
{
    if(array.length == 0)
        return null;
    var modeMap = {};
    var maxEl = array[0], maxCount = 1;
    for(var i = 0; i < array.length; i++)
    {
        var el = array[i];
        if(modeMap[el] == null)
            modeMap[el] = 1;
        else
            modeMap[el]++;
        if(modeMap[el] > maxCount)
        {
            maxEl = el;
            maxCount = modeMap[el];
        }
    }
    return maxEl;
}

//from http://www.codeproject.com/Articles/317974/KinectDepthSmoothing
function smoothDepth(arr){
  var res = createArray(width,height);
  for(var i=2; i< width-2; i++){
    for(var j=2; j < height-2; j++){
      if(arr[i][j]===0){
        var innerBandCount = 0;
        var outerBandCount = 0;
        var filterCollection = [];

        for (var y = -2; y < 3; y++)
        {
          for (var x = -2; x < 3; x++)
          {
            if (x != 0 || y != 0)
            {
              var i2 = i + x;
              var j2 = j + y;
              if(arr[i2][j2]!=0){
                filterCollection.push(arr[i2][j2]);
                if (y != 2 && y != -2 && x != 2 && x != -2){
                  innerBandCount++;
                }
                else{
                  outerBandCount++;
                }

              }
            }
          }
        }
        if (innerBandCount >= innerBandThreshold || outerBandCount >= outerBandThreshold)
        {
          res[i][j] = mode(filterCollection);
        }
        else{
          res[i][j] = arr[i][j];
        }
      }
      else{
        res[i][j] = arr[i][j];
      }
    }
  }
  return res;
}


function movingAverage(arr, movingAverageWindow){
  depthQueue.push(arr);

  if (depthQueue.length > movingAverageWindow){
    depthQueue.shift();
  }

  var denominator = 0;
  var count = 1;
  var sumDepthArray = createArray(width,height);
  var averagedDepthArray = createArray(width,height);

  for(var i=0; i<width; i++){
    for( var j=0; j<height; j++){
      sumDepthArray[i][j] =0;
    }
  }

  for(var layer=depthQueue.length-1; layer >=0 ; layer--){
    for(var i=0; i<width; i++){
      for( var j=0; j<height; j++){
       //the y coord is shifted for previous arrays to get an upward
       //movement
        sumDepthArray[i][j] += depthQueue[layer][i][j+2*count] * count;
      }
    }
    denominator+=count;
    count++;
  }
  for(var i=0; i<width; i++){
    for( var j=0; j<height; j++){
      averagedDepthArray[i][j] = sumDepthArray[i][j]/denominator;
    }
  }
  return averagedDepthArray;
}

var kcontext = kinect();
var width = 640;
var height = 480;
var mem = createArray(width,height);
var innerBandThreshold = 2;
var outerBandThreshold = 8;
var depthQueue = [];


//for edge calc
var BASE_THRESH = 1000;
var DIFF_THRESH = 3;

kcontext.resume();
kcontext.start('depth')
var kstream = new BufferStream();

kcontext.on('depth', function (buf) {
  var bytearray = new Uint8Array(buf);
  var dataArray = getDataArray(bytearray);
  var smoothArray = smoothDepth(dataArray);
  var aveArray = movingAverage(smoothArray,3);
  var procArray = processArray(aveArray);
  var buffer = getBufferFromArray(procArray);
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



