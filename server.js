var app = require('http').createServer(handler).listen(3000)
, fs = require('fs')
, kinect = require('kinect')
, BufferStream = require('bufferstream')
, WebSocketServer = require('ws').Server
, websocket = require('websocket-stream')
, Png = require('png').Png
, wss = new WebSocketServer({server: app});

function handler (req, res) {
  if(req.url === "/"){
    fs.readFile(__dirname + '/index.html',
        function (err, data) {
          if (err) {
            res.writeHead(500);
            return res.end('Error loading index.html');
          }
          res.writeHead(200)
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

function createArray(width, height) {
  var arr = new Array(width);
  for(var i=0; i< width; i++){
    arr[i] = new Array(height);
  }
  return arr
}

function getDataArray(output, bytearray){
  for(var i=0;i<bytearray.length/2;i++){
    //for depth feed  . bytearray  [val , mult, val2, mult2, ...]
    // when out of range, mult=7. range (0-255, 0-7)
    var depthVal = bytearray[2*i]+bytearray[2*i+1]*256;
    var x = i % width;
    var y = Math.floor(i / width);
    output[x][y] = depthVal;

    if(depthVal>2040){
      output[x][y]=0;
    }
  }
}

function getBufferFromArray(buf, arr){
  for(var i=0; i<width; i++){
    for(var j=0; j <height; j++){
      var index = j*width + i;
      buf[index] = arr[i][j];
    }
  }
}

function processArray(res, arr){
  for(var i=0; i< width-1; i++){
    for(var j=0; j < height-1; j++){
      var diffy = Math.abs(arr[i][j]-arr[i][j+1]);
      var diffx = Math.abs(arr[i][j]-arr[i+1][j]);
      if((diffy>1 || diffx>1)){
        res[i][j] = Math.max(diffy,diffx)*2+200;
      }
      else{
        res[i][j] = 0;
      }
    }
  }
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
function smoothDepth(res, arr){
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
}


function movingAverage(averagedDepthArray, sumDepthArray, arr, movingAverageWindow){
  depthQueue.push(arr);

  if (depthQueue.length > movingAverageWindow){
    depthQueue.shift();
  }

  var denominator = 0;
  var count = 1;

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
}


function getImageFromArray(img, arr){
  for(var i=0; i<width; i++){
    for(var j=0; j <height; j++){
      var index = j*width + (width-i);
      var depth = arr[i][j];
      img[3*index] = depth;
      img[3*index+1] = depth;
      img[3*index+2] = depth;
    }
  }
}


var kcontext = kinect();
var width = 640;
var height = 480;
var innerBandThreshold = 2;
var outerBandThreshold = 8;
var depthQueue = [];

//for edge calc
var BASE_THRESH = 1000;
var DIFF_THRESH = 3;

kcontext.resume();
kcontext.start('depth')
var kstream = new BufferStream();
var bytearray = new Uint8Array(614400);
var dataArray = createArray(width,height);
var procArray = createArray(width,height);
var smoothArray = createArray(width,height);
var aveArray= createArray(width,height);
var sumArray= createArray(width,height);
var buffer = new Buffer(width*height);
var imgdata = new Buffer(width*height*3);

kcontext.on('depth', function (buf) {
  bytearray = Uint8Array(buf);
  getDataArray(dataArray, bytearray);
  smoothDepth(smoothArray, dataArray);
  movingAverage(aveArray, sumArray, smoothArray,3);
  processArray(procArray, aveArray);
  getImageFromArray(imgdata, procArray);

  //getBufferFromArray(buffer, procArray);

  png = new Png(imgdata, width, height, 'rgb');
  png.encode(function(img){
    kstream.write(img);
  });
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



