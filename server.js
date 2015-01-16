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

      // TODO: Check perms

      Game.getMap(playerObj.location.map).draw( drawData );

      Game.mapUpdate(playerObj, playerObj.location, drawData.symbol);
      playerObj.location.x++;
      Game.updateSurroundingPlayers(playerObj);
    });

    socket.on('mapWall', function(wallData) {
      var playerObj = Game.getPlayerBySocketId(socket.id);

      // TODO: Check perms
      Game.getMap(playerObj.location.map).wall(wallData);

      Game.mapUpdateWall(playerObj, wallData);
    });

    socket.on('mapColor', function(colorData) {
      var playerObj = Game.getPlayerBySocketId(socket.id);

      // TODO: Check perms
      Game.getMap(playerObj.location.map).color(colorData);

      Game.mapUpdateColor(playerObj, colorData);
    });

    socket.on('mapDelete', function(drawData) {
      var playerObj = Game.getPlayerBySocketId(socket.id);

      // TODO: Check perms
      Game.getMap(playerObj.location.map).undraw( drawData );

      Game.mapUpdateDelete(playerObj, playerObj.location);
      playerObj.location.x--;
      Game.updateSurroundingPlayers(playerObj);
    });

    socket.on('mapSay', function(sayData) {
      var playerObj = Game.getPlayerBySocketId(socket.id);
      Game.sayToSurroundingPlayers(playerObj, sayData.text);
    });

    socket.on('mapAnimation', function(animationData) {
      var playerObj = Game.getPlayerBySocketId(socket.id);
      Game.getMap(playerObj.location.map).setAnimation(animationData);
      Game.doOnMapPlayers(playerObj, false, function(_player) {
        _player.socket.emit('mapAnimation', animationData);
      });
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

// De-init stuff
process.on('SIGINT', function() {
  Game.save(function() {
    process.exit();
  });
});