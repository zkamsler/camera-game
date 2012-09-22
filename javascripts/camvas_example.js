// # Example call for the demo at http//cbrandolino.github.com/camvas

// If the browser does not support any URL, getUserMedia or
// In this example call, we will directly draw the webcam stream on a canvas.

var isColorOrange = function(r, g, b) {
  var   min = Math.min(r,g,b),
        max = Math.max(r,g,b),
        delta = max - min,
        average = (r+g+b)/3;

    return (r > g && r > b) && ((delta / max) > 0.45) && max > 180 && average > 25 && average < 235;
};

var isOrange = function(ctx, x, y) {
  var color = ctx.getImageData(x,y,1,1),
        r = color.data[0],
        g = color.data[1],
        b = color.data[2],
        min = Math.min(r,g,b),
        max = Math.max(r,g,b),
        delta = max - min;

    return (r > g && r > b) && (delta / max) > 0.50;
};

var isRectOrange = function(ctx, x, y, w, h) {
  var colors = ctx.getImageData(x,y,w,h),
      data = colors.data,
      max = w*h*4;
  for(var i = 0; i < max; i+=4) {
    if(isColorOrange(data[i], data[i+1], data[i+2])) {
      return true;
    }
  }

  return false;
};

var paintRectOrange = function(ctx, x, y, w, h) {
  var colors = ctx.getImageData(x,y,w,h),
      data = colors.data,
      max = w*h*4;
  for(var i = 0; i < max; i+=4) {
    if(isColorOrange(data[i], data[i+1], data[i+2])) {
      data[i] = 255;
      data[i+1] = data[i+2] = 0;
    }
  }

  ctx.putImageData(colors, 0, 0);
};

var width = 640;
var height = 480;
var halfwidth = width/2;

var updateFall = function(ctx, obj, dt, time) {
  obj.y += 0.001 * obj.speed * dt;
  obj.x = obj.entry + Math.sin(time*0.005) * 50;
  return (obj.y > height+50);
};

var updateLeft = function(ctx, obj, dt, time) {
  obj.x += 0.001 * obj.speed * dt;
  return (obj.x > width+50);
};

var updateRight = function(ctx, obj, dt, time) {
  obj.x -= 0.001 * obj.speed * dt;
  return (obj.x < -50);
};

var genFaller = function(difficulty) {
  return {
    y : -25,
    x : 0,
    speed : 200 + 50*difficulty*(Math.random()+0.5),
    entry : (Math.random() * width/ 2) + (width/4),
    update: updateFall
  };
};

var genLeft = function(difficulty) {
  return {
    y : (Math.random() * height/2) + (height/8),
    x : -25,
    speed : 300 + 100*difficulty*(Math.random()+0.5),
    update: updateLeft
  };
};

var genRight = function(difficulty) {
  return {
    y : (Math.random() * height/2) + (height/8),
    x : width+25,
    speed : 300 + 100*difficulty*(Math.random()+0.5),
    update: updateRight
  };
};

var generators = [
  genLeft,
  genFaller,
  genRight
];


window.onload = function(){
  var ctx = document.getElementsByTagName('canvas')[0].getContext('2d');

  var startGenPeriod = 3*1000;
  var lastGenTime;
  var difficulty = 1;

  var shapes = [
    genFaller(difficulty)
  ];

  var draw = function(video, dt, time) {
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1,1);
    ctx.drawImage(video, 0, 0);
    ctx.restore();

    paintRectOrange(ctx,0,0,width,height);
    //return;

    if(lastGenTime === undefined) {
      lastGenTime = time;
    }

    if(lastGenTime + startGenPeriod/Math.sqrt(difficulty) < time) {
      var newShape = generators[Math.floor(Math.random() * generators.length)](difficulty);
      shapes.push(newShape);
      lastGenTime = time;
    }

    for(var i = 0; i < shapes.length; ++i) {
      var obj = shapes[i];
      if(obj.update(ctx, obj, dt, time)) {
        difficulty = 1;
        shapes.splice(i,1);
        --i;
      } else if(isRectOrange(ctx, obj.x-15, obj.y-15, 30, 30)) {
        difficulty++;
        shapes.splice(i,1);
        --i;
      } else {
        ctx.fillRect (obj.x-25, obj.y-25, 55, 50);
      }
    }
  };
  var myCamvas = new camvas(ctx, draw);
};

// # The camvas.js library

// requestAnimationFrame implementation, we just ignore it.
// My policy for experimental software is: if you don't have a
// nightly build, you don't deserve exceptions.
window.URL = window.URL || window.webkitURL;

navigator.getUserMedia  = navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia;

window.requestAnimationFrame = window.requestAnimationFrame ||
                               window.webkitRequestAnimationFrame ||
                               window.mozRequestAnimationFrame ||
                               window.msRequestAnimationFrame ||
                               window.oRequestAnimationFrame;

// The function takes a canvas context and a `drawFunc` function.
// `drawFunc` receives two parameters, the video and the time since
// the last time it was called.
function camvas(ctx, drawFunc) {
  var self = this;
  this.ctx = ctx;
  this.draw = drawFunc;

  // We can't `new Video()` yet, so we'll resort to the vintage
  // "hidden div" hack for dynamic loading.
  var streamContainer = document.createElement('div');
  this.video = document.createElement('video');

  // If we don't do this, the stream will not be played.
  // By the way, the play and pause controls work as usual
  // for streamed videos.
  this.video.setAttribute('autoplay', '1');

  // The video should fill out all of the canvas
  this.video.setAttribute('width', this.ctx.canvas.width);
  this.video.setAttribute('height', this.ctx.canvas.height);

  this.video.setAttribute('style', 'display:none');
  streamContainer.appendChild(this.video);
  document.body.appendChild(streamContainer);

  // The callback happens when we are starting to stream the video.
  navigator.getUserMedia({video: true}, function(stream) {
    // Yay, now our webcam input is treated as a normal video and
    // we can start having fun
    self.video.src = window.URL.createObjectURL(stream);
    // Let's start drawing the canvas!
    self.update();
  });

  // As soon as we can draw a new frame on the canvas, we call the `draw` function
  // we passed as a parameter.
  this.update = function() {
    var self = this;
    var last = Date.now();
    var loop = function() {
      // For some effects, you might want to know how much time is passed
      // since the last frame; that's why we pass along a Delta time `dt`
      // variable (expressed in milliseconds)
      var now = Date.now();
      var dt = now - last;
      self.draw(self.video, dt, now);
      last = now;
      requestAnimationFrame(loop) ;
    };
    requestAnimationFrame(loop);
  };
}

