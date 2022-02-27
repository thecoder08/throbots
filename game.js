// global variables
var searchParams = new URL(document.location.href).searchParams;
var dedicated = searchParams.get('dedicated') == 'true';
var player = parseInt(searchParams.get('player'));
var address = searchParams.get('address');
var name = searchParams.get('name');
var ctx = $('#canvas').getContext('2d');
var fs = require('fs');
var runScript = require('./speech.js');
var speechBox = '';
var theme = '';
var themesong = new Audio();
var images = {};
var fpscounter = 0;
var fpslimit = 1000 / 60;
var platforms = [];
var entities = {};
var entityFrames = {};
var leftDown = false;
var rightDown = false;
var animationFrame = 0;
// function for loading images
function loadImage(image) {
  images[image] = new Image();
  images[image].src = 'images/' + image + '.png';
}
// loading screen
loadImage('loading');
images['loading'].onload = function() {
  ctx.drawImage(images['loading'], 0, 0);
}
// load image assets
loadImage('dead');
loadImage('deadtext');
for (var i = 0; i < 4; i++) {
  entityFrames['player' + i + '/still'] = 1;
  entityFrames['player' + i + '/jump'] = 1;
  entityFrames['player' + i + '/crouch'] = 1;
  loadImage('player' + i + '/still0');
  loadImage('player' + i + '/jump0');
  loadImage('player' + i + '/crouch0');
  if (i == 0) {
    entityFrames['player' + i + '/left'] = 3;
    entityFrames['player' + i + '/right'] = 3;
    for (var j = 0; j < 3; j++) {
      loadImage('player' + i + '/left' + j);
      loadImage('player' + i + '/right' + j);
    }
  }
  else {
    entityFrames['player' + i + '/left'] = 2;
    entityFrames['player' + i + '/right'] = 2;
    for (var j = 0; j < 2; j++) {
      loadImage('player' + i + '/left' + j);
      loadImage('player' + i + '/right' + j);
    }
  }
}
loadImage('box0');
entityFrames['box'] = 1;
// disconnect function
function disconnect() {
  if (dedicated) {
    request('http://' + address + '/leave?entity=' + name, function(data) {
      document.location.href = 'index.html';
    });
  }
  else {
    request('http://34.71.49.178:25568/leave?lennetlobbyid=' + address + '&entity=' + name, function(data) {
      document.location.href = 'index.html';
    });
  }
}
// join game
if (dedicated) {
  request('http://' + address + '/join?entity=' + name + '&player=' + player, function(data) {
    if (data == 'entity already exists') {
      alert('There is already a player with name ' + name + '!');
      document.location.href = 'index.html';
    }
    else {
      theme = data;
      // initial fetch
      fetchloop();
      // load theme-specific assets
      loadImage(theme);
      loadImage(theme + 'platform');
      loadImage(theme + 'enemyleft');
      loadImage(theme + 'enemyright');
      themesong.src = 'audio/' + theme + '.wav';
      themesong.loop = true;
      themesong.play();
      images[theme].onload = function() {
        gameloop = setInterval(loop, fpslimit);
      }
    }
  });
}
else {
  request('http://34.71.49.178:25568/join?lennetlobbyid=' + address + '&entity=' + name + '&player=' + player, function(data) {
    if (data == '404 lobby ' + address + ' not found') {
      alert('Could not find game: ' + data);
      document.location.href = 'index.html';
    }
    else if (data == 'entity already exists') {
      alert('There is already a player with name ' + name + '!');
      document.location.href = 'index.html';
    }
    else {
      theme = data;
      // load theme-specific assets
      loadImage(theme);
      loadImage(theme + 'platform');
      loadImage(theme + 'enemyleft');
      loadImage(theme + 'enemyright');
      var themesong = new Audio();
      themesong.src = 'audio/' + theme + '.wav';
      themesong.loop = true;
      themesong.play();
      images[theme].onload = function() {
        gameloop = setInterval(loop, fpslimit);
      }
    }
  });
}
// game loop
function loop() {
  if (entities.hasOwnProperty(name)) {
    // client-side prediction
    if (leftDown) {
      entities[name].x--;
    }
    if (rightDown) {
      entities[name].x++;
    }
    // clear canvas
    $('#canvas').width = $('#canvas').width;
    // increment fps counter
    fpscounter++;
    // draw background
    ctx.drawImage(images[theme], 0, 0);
    // draw speech
    var textLines = speechBox.split('\n');
    var textY = 10;
    for (var i = 0; i < textLines.length; i++) {
      ctx.fillText(textLines[i], 5, textY);
      textY += 10;
    }
    // draw platforms
    for (var i = 0; i < platforms.length; i++) {
      ctx.drawImage(images[theme + 'platform'], platforms[i].x - entities[name].x + 114, platforms[i].y);
    }
    // draw entities and nametags
    for (var entity in entities) {
      ctx.drawImage(images[entities[entity].frame + (animationFrame % entityFrames[entities[entity].frame])], (entities[entity].x - entities[name].x) + 100, entities[entity].y - 34);
      ctx.fillText(entity, (entities[entity].x - entities[name].x) + 100, entities[entity].y - 34);
    }
  }
  // if we died or got kicked
  else {
    // stop the game from running
    clearInterval(gameloop);
    // display red background
    ctx.drawImage(images['dead'], 0, 0);
    // stop theme song
    themesong.pause();
    // wait 1 second
    setTimeout(function() {
      // display death message
      ctx.drawImage(images['deadtext'], 5, 90);
      // play death song
      var deathsong = new Audio();
      deathsong.src = 'audio/death.wav';
      deathsong.play();
    }, 1000);
  }
}
// fetch loop
function fetchloop() {
  if (dedicated) {
    request('http://' + address + '/getentities', function(data) {
      entities = JSON.parse(data);
    });
    request('http://' + address + '/getplatforms', function(data) {
      platforms = JSON.parse(data);
    });
  }
  else {
    request('http://34.71.49.178:25568/getentities?lennetlobbyid=' + address, function(data) {
      entities = JSON.parse(data);
    });
    request('http://34.71.49.178:25568/getplatforms?lennetlobbyid=' + address, function(data) {
      platforms = JSON.parse(data);
    });
  }
}
// keydown
document.onkeydown = function(event) {
  if (!event.repeat) {
  if (event.code == 'KeyO') {
    speechBox = '';
    runScript(JSON.parse(fs.readFileSync('script.json')), function(char) {
      if (char == 'clear') {
        speechBox = '';
      }
      else {
        speechBox += char;
      }
    });
  }
  if (event.code == 'KeyW') {
    if (dedicated) {
      request('http://' + address + '/jump?entity=' + name, function() {});
    }
    else {
      request('http://34.71.49.178:25568/jump?lennetlobbyid=' + address + '&entity=' + name, function() {});
    }
  }
  if (event.code == 'KeyA') {
    leftDown = true;
    if (dedicated) {
      request('http://' + address + '/leftdown?entity=' + name, function() {});
    }
    else {
      request('http://34.71.49.178:25568/leftdown?lennetlobbyid=' + address + '&entity=' + name, function() {});
    }
  }
  if (event.code == 'KeyD') {
    rightDown = true;
    if (dedicated) {
      request('http://' + address + '/rightdown?entity=' + name, function() {});
    }
    else {
      request('http://34.71.49.178:25568/rightdown?lennetlobbyid=' + address + '&entity=' + name, function() {});
    }
  }
  if (event.code == 'KeyS') {
    if (dedicated) {
      request('http://' + address + '/crouchdown?entity=' + name, function() {});
    }
    else {
      request('http://34.71.49.178:25568/crouchdown?lennetlobbyid=' + address + '&entity=' + name, function() {});
    }
  }
  }
}
// keyup
document.onkeyup = function(event) {
  if (event.code == 'KeyA') {
    leftDown = false;
    if (dedicated) {
      request('http://' + address + '/leftup?entity=' + name, function() {});
    }
    else {
      request('http://34.71.49.178:25568/leftup?lennetlobbyid=' + address + '&entity=' + name, function() {});
    }
  }
  if (event.code == 'KeyD') {
    rightDown = false;
    if (dedicated) {
      request('http://' + address + '/rightup?entity=' + name, function() {});
    }
    else {
      request('http://34.71.49.178:25568/rightup?lennetlobbyid=' + address + '&entity=' + name, function() {});
    }
  }
  if (event.code == 'KeyS') {
    if (dedicated) {
      request('http://' + address + '/crouchup?entity=' + name, function() {});
    }
    else {
      request('http://34.71.49.178:25568/crouchup?lennetlobbyid=' + address + '&entity=' + name, function() {});
    }
  }
}
// throw nearest entity on click
$('#canvas').onclick = function(event) {
  var rect = canvas.getBoundingClientRect();
  var clickX = Math.floor((event.clientX - rect.left) / 100) - 5;
  var clickY = Math.floor((event.clientY - rect.top) / 100) - 5;
  if (dedicated) {
    request('http://' + address + '/throw?entity=' + name + '&x=' + clickX + '&y=' + clickY, function() {});
  }
  else {
    request('http://34.71.49.178:25568/throw?lennetlobbyid=' + address + '&entity=' + name + '&x=' + clickX + '&y=' + clickY, function() {});
  }
}
// gameloop controller
setInterval(function() {
  $('#fps').innerHTML = fpscounter;
  fpscounter = 0;
}, 1000);
$('#fpslimiter').oninput = function() {
  if ($('#fpslimiter').value == 301) {
    $('#maxfps').innerHTML = 'Unlimited';
    fpslimit = 0;
  }
  else {
    $('#maxfps').innerHTML = $('#fpslimiter').value;
    fpslimit = 1000 / parseInt($('#fpslimiter').value);
  }
  clearInterval(gameloop);
  gameloop = setInterval(loop, fpslimit);
}
// fetchloop controller
setInterval(fetchloop, 1000 / 30);
// animation loop
setInterval(function() {
  animationFrame++;
}, 125);
