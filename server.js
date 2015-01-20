// express
var express = require('express');
var app = express();
// express logger (morgan)
var logger = require('morgan');
// LESS (express middleware)
var lessMiddleware = require('less-middleware');
// socket.io
var server = require('http').Server(app);
var io = require('socket.io')(server);

//app.use(logger());
app.use('/assets', lessMiddleware(__dirname + '/assets'));
app.use('/assets', express.static(__dirname + '/assets'));
app.use(express.static(__dirname + '/html'));

var server = server.listen(process.env.PORT || 3000, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('AsciiMMO server listening at http://%s:%s', host, port);
});

// Require game classes
var Game = require('./classes/game.js');

// Init
Game = new Game().init();

// Socket stuff
io.on('connection', function(socket) {
  console.log('Socket connection opened id=%s', socket.id);

  socket.on('login', function(loginData) {
    if(Game.getPlayerByUsername(loginData.username.toLowerCase())) {
      socket.emit('text', 'That user is already logged in.');
      return;
    }

    Game.addPlayer(socket).load(loginData, function(_player) {
      socket.emit('loggedIn', {
        id: socket.id,
        username: _player.username,
        style: _player.getStyle(),
        canEdit: _player.canEdit
      });

      _player.renderMap(Game.getMap(_player.location.map), false);
      Game.updateSurroundingPlayers(_player);
      Game.getSurroundingPlayers(_player);
    });

    // Bind after-login events
    socket.on('location', function(locationData) {
      var playerObj = Game.getPlayerBySocketId(socket.id);
      playerObj.location.x = locationData.x;
      playerObj.location.y = locationData.y;

      var newRoom = Game.getMap(playerObj.location.map).getRoom(locationData.x, locationData.y);
      if(newRoom && newRoom.link) {
        if(!playerObj.canEdit || (playerObj.canEdit && !locationData.shiftKey)) {
          var newMap = Game.getMap(newRoom.link.map);
          if( (newMap === null && playerObj.canEdit) || newMap !== null) {
            // Let's go to a new map
            var oldMap = playerObj.location.map;
            playerObj.location.map = newRoom.link.map;
            playerObj.location.x = newRoom.link.x;
            playerObj.location.y = newRoom.link.y;
            // Render new map
            playerObj.renderMap(newMap, true);
            Game.getSurroundingPlayers(playerObj); // Get players around you
            Game.updateSurroundingPlayers(playerObj); // Notify other players around you about yourself
            Game.removePlayerFromMap(playerObj, oldMap); // Remove you from players on old map
            return;
          }
        }
      }

      Game.updateSurroundingPlayers(playerObj);
    });

    socket.on('mapDraw', function(drawData) {
      var playerObj = Game.getPlayerBySocketId(socket.id);
      if(!playerObj.canEdit){ return; }

      Game.getMap(playerObj.location.map).draw(drawData, playerObj.editingObject);

      Game.mapUpdate(playerObj, playerObj.location, drawData.symbol, playerObj.editingObject);
      playerObj.location.x++;
      Game.updateSurroundingPlayers(playerObj);
    });

    socket.on('mapWall', function(wallData) {
      var playerObj = Game.getPlayerBySocketId(socket.id);
      if(!playerObj.canEdit){ return; }

      // TODO: Check perms
      Game.getMap(playerObj.location.map).wall(wallData);

      Game.mapUpdateWall(playerObj, wallData);
    });

    socket.on('mapColor', function(colorData) {
      var playerObj = Game.getPlayerBySocketId(socket.id);
      if(!playerObj.canEdit){ return; }

      Game.getMap(playerObj.location.map).color(colorData);

      Game.mapUpdateColor(playerObj, colorData);
    });

    socket.on('mapDelete', function(drawData) {
      var playerObj = Game.getPlayerBySocketId(socket.id);
      if(!playerObj.canEdit){ return; }

      Game.getMap(playerObj.location.map).undraw(drawData, playerObj.editingObject, function onObjectDelete() {
        Game.doOnMapPlayers(playerObj, true, function(_player) {
          _player.socket.emit('objectDelete', {
            name: playerObj.editingObject
          });
          playerObj.editingObject = false;
          _player.socket.emit('text', 'No longer editing object. Object has been deleted.');
        });
      });

      Game.mapUpdateDelete(playerObj, playerObj.location, playerObj.editingObject);

      playerObj.location.x--;
      Game.updateSurroundingPlayers(playerObj);
    });

    socket.on('mapSay', function(sayData) {
      var playerObj = Game.getPlayerBySocketId(socket.id);
      Game.sayToSurroundingPlayers(playerObj, sayData.text);
    });

    socket.on('runCommand', function(commandData) {
      var playerObj = Game.getPlayerBySocketId(socket.id);
      var command = commandData.cmd.split(' ')[0];
      var args = commandData.cmd.split(' ').splice(1);

      switch(command) {
        case 'animate':
          if(!playerObj.canEdit || args.length < 2){ return; }
          var animationData = { x: playerObj.location.x, y: playerObj.location.y, animation: args.join(' ') };
          Game.getMap(playerObj.location.map).setAnimation(animationData);
          Game.doOnMapPlayers(playerObj, true, function(_player) {
            _player.socket.emit('mapAnimation', animationData);
          });
          socket.emit('text', 'Your animation has been applied to the map.');
          break;
        case 'link':
          if(!playerObj.canEdit || args.length !== 3){ return; }
          var linkData = { x: playerObj.location.x, y: playerObj.location.y, link: { map: args[0], x: parseInt(args[1]), y: parseInt(args[2]) } };
          Game.getMap(playerObj.location.map).setLink(linkData);
          Game.doOnMapPlayers(playerObj, true, function(_player) {
            _player.socket.emit('mapLink', linkData);
          });
          socket.emit('text', 'Your map-link has been applied to the map.');
          break;
        case 'flag':
          if(!playerObj.canEdit || args.length !== 1){ return; }
          var flagData = { x: playerObj.location.x, y: playerObj.location.y, flag: args[0].toLowerCase() };
          var newFlags = Game.getMap(playerObj.location.map).toggleFlag(flagData);
          Game.doOnMapPlayers(playerObj, true, function(_player) {
            _player.socket.emit('mapFlag', {
              x: flagData.x,
              y: flagData.y,
              flags: newFlags
            });
          });
          socket.emit('text', 'Your flag has been applied to the map.');
          break;
        case 'objedit':
          if(!playerObj.canEdit){ return; }
          var objHere = Game.getMap(playerObj.location.map).getObjectAt(playerObj.location.x, playerObj.location.y);
          if(playerObj.editingObject) {
            playerObj.editingObject = null;
            socket.emit('text', 'You are no longer editing any objects.');
            socket.emit('editingObject', { obj: null });
          } else if(objHere) {
            socket.emit('text', 'You are now editing \'' + objHere.name + '\'.');
            socket.emit('editingObject', { obj: objHere.name });
            playerObj.editingObject = objHere.name;
          } else {
            socket.emit('text', 'There are no objects here. Hold SHIFT to see the objects around you.');
          }
          break;
        case 'objpath':
          if(!playerObj.canEdit){ return; }
          var objHere = Game.getMap(playerObj.location.map).getObjectAt(playerObj.location.x, playerObj.location.y);
          if(objHere) {
            if(args.length === 0) {
              socket.emit('text', 'The object path for ' + objHere.name + ' is: ' + objHere.path);
            } else {
              objHere.path = args[0];
              socket.emit('text', 'The object path has been set for ' + objHere.name + '.');
            }
          } else {
            socket.emit('text', 'There are no objects here. Hold SHIFT to see the objects around you.');
          }
          break;
        case 'objstops':
          if(!playerObj.canEdit){ return; }
          var objHere = Game.getMap(playerObj.location.map).getObjectAt(playerObj.location.x, playerObj.location.y);
          if(objHere) {
            if(args.length === 0) {
              socket.emit('text', 'The object stops for ' + objHere.name + ' are: ' + objHere.stops);
            } else {
              objHere.stops = args[0];
              socket.emit('text', 'The object stops have been set for ' + objHere.name + '.');
            }
          } else {
            socket.emit('text', 'There are no objects here. Hold SHIFT to see the objects around you.');
          }
          break;
        case 'objhalt':
          if(!playerObj.canEdit){ return; }
          var objHere = Game.getMap(playerObj.location.map).getObjectAt(playerObj.location.x, playerObj.location.y);
          if(objHere) {
            if(objHere.halt) {
              objHere.halt = false;
              socket.emit('text', 'The object ' + objHere.name + ' has been resumed.');
            } else {
              objHere.halt = true;
              socket.emit('text', 'The object ' + objHere.name + ' has been halted.');
            }
          } else {
            socket.emit('text', 'There are no objects here. Hold SHIFT to see the objects around you.');
          }
          break;
        case 'objcreate':
          if(!playerObj.canEdit || args.length !== 1){ return; }
          var objectCreationSuccessful = Game.getMap(playerObj.location.map).createObject(args[0], playerObj.location.x, playerObj.location.y);
          if(objectCreationSuccessful !== false) {
            socket.emit('text', 'An object has been created: ' + objectCreationSuccessful.name);
            Game.doOnMapPlayers(playerObj, true, function(_player) {
              _player.socket.emit('objectCreate', objectCreationSuccessful);
            });
          } else {
            socket.emit('text', 'The object could not be created.');
          }
          break;
      }
    });
  });

  socket.on('disconnect', function() {
    var playerObj = Game.getPlayerBySocketId(socket.id);
    if(playerObj) {
      Game.removePlayerFromMap(playerObj, playerObj.location.map);
      Game.removePlayer(socket.id);
    }
    console.log('Socket connection closed id=%s', socket.id);
  });
});

// Handle movement ticks for objects
setInterval(function() {
  Game.eachMap(function(map) {
    if(!map.objects) {
      return;
    }

    map.objects.forEach(function(obj) {

      if(!obj.path || obj.halt === true) {
        return;
      }

      if(typeof obj.pathTick === 'undefined') {
        obj.pathTick = 1;
      }

      obj.pathTick--;

      if(obj.pathTick > 0) {
        return;
      }

      var currentPathIndex = ((typeof obj.index === 'undefined') ? -1 : obj.index);
      var nextPathIndex = currentPathIndex + 1;

      if(nextPathIndex > obj.path.split('|').length - 1) {
        nextPathIndex = 0;
      }

      if(!obj.path.split('|')[nextPathIndex]) {
        nextPathIndex = 0;
      }

      var oldx = obj.x;
      var oldy = obj.y;

      obj.x = parseInt(obj.path.split('|')[nextPathIndex].split(',')[0]);
      obj.y = parseInt(obj.path.split('|')[nextPathIndex].split(',')[1]);
      obj.pathTick = ((obj.stops && obj.stops.split('|').indexOf(obj.x.toString() + ',' + obj.y.toString()) > -1) ? 30 : 1);
      obj.index = nextPathIndex;

      Game.doOnSurroundingPlayersUsingMap(map.name, 50, oldx, oldy, function(_player) {
        for(var r = 0; r < obj.rooms.length; r++) {
          var oldObjectRoomX = oldx + obj.rooms[r].x;
          var oldObjectRoomY = oldy + obj.rooms[r].y;

          if(_player.location.x === oldObjectRoomX && _player.location.y === oldObjectRoomY) {
            var playerOldRoomRelativeX = _player.location.x - oldx;
            var playerOldRoomRelativeY = _player.location.y - oldy;

            _player.location.x = obj.x + playerOldRoomRelativeX;
            _player.location.y = obj.y + playerOldRoomRelativeY;

            _player.socket.emit('playerMovement', {
              x: _player.location.x,
              y: _player.location.y
            });

            Game.updateSurroundingPlayers(_player);

            break;
          }
        }
      });

      Game.doOnMapPlayersUsingMap(map.name, function(_player) {
        _player.socket.emit('objectMove', {
          name: obj.name,
          x: obj.x,
          y: obj.y
        });
      });
    });
  });
}, 1000);

// De-init stuff
process.on('SIGINT', function() {
  Game.save(function() {
    process.exit();
  });
});