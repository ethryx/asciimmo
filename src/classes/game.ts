import WorldMap from './WorldMap';
import Player from './Player';
var fs = require('fs');
var _ = require('underscore');

function Game() {
  this.maps = null;
  this.players = [];
}

Game.prototype.save = function(doneCallback) {
  const mapData = this.maps.map(map => {
    return map.saveToConfig()
  });

  // Save maps
  fs.writeFile('./data/maps', JSON.stringify(mapData), function(e) {
    console.log('Maps saved.');

    // Save logged in players
    var saveNextPlayer = function() {
      if(this.players.length >= 1) {
        var nextPlayer = this.players.shift();
        nextPlayer.save(saveNextPlayer);
      } else {
        console.log('Players saved.');
        doneCallback();
      }
    }.bind(this);
    saveNextPlayer();
  }.bind(this));

  return this;
};

Game.prototype.getMap = function(mapName) {
  for(var i = 0; i < this.maps.length; i++) {
    if(this.maps[i].name === mapName) {
      return this.maps[i];
    }
  }

  return null;
};

Game.prototype.createNewMap = function(mapName) {
  var newMap = new WorldMap(mapName);
  this.maps.push(newMap);
  console.log('New map loaded [name=%s]', mapName);
  return newMap;
};

Game.prototype.eachMap = function(func) {
  this.maps.forEach(function(_map) {
    func(_map);
  });
};

Game.prototype.removePlayer = function(socketId) {
  var playerObject = this.getPlayerBySocketId(socketId);
  if(playerObject) {
    playerObject.save(function() {
      this.players.splice(this.players.indexOf(playerObject), 1);
      console.log('Player disconnected [socket=%s players=%s]', socketId, this.players.length);
    }.bind(this));
  }
};

Game.prototype.getPlayerBySocketId = function(socketId) {
  for(var x = 0; x < this.players.length; x++) {
    if(this.players[x].socketId === socketId) {
      return this.players[x];
    }
  }

  return null;
};

Game.prototype.getPlayerByUsername = function(username) {
  for(var x = 0; x < this.players.length; x++) {
    if(this.players[x].username === username) {
      return this.players[x];
    }
  }

  return null;
};

Game.prototype.doOnSurroundingPlayers = function(player, radius, includingSelf, doFunc) {
  this.players.forEach(function(_player) {
    if(_player.location.type === 'map' && _player.location.map === player.location.map) {
      if( Math.abs(player.location.x - _player.location.x) < radius && Math.abs(player.location.y - _player.location.y) < radius) {
        if(_player !== player || includingSelf === true) {
          doFunc(_player);
        }
      }
    }
  });
};

Game.prototype.doOnSurroundingPlayersUsingMap = function(map, radius, x, y, doFunc) {
  this.players.forEach(function(_player) {
    if(_player.location.type === 'map' && _player.location.map === map) {
      if( Math.abs(_player.location.x - x) < radius && Math.abs(_player.location.y - y) < radius ) {
        doFunc(_player);
      }
    }
  });
};

Game.prototype.doOnMapPlayers = function(player, includingSelf, doFunc) {
  this.players.forEach(function(_player) {
    if(_player.location.type === 'map' && _player.location.map === player.location.map) {
      if(_player !== player || includingSelf === true) {
        doFunc(_player);
      }
    }
  });
};

Game.prototype.doOnMapPlayersUsingMap = function(map, doFunc) {
  this.players.forEach(function(_player) {
    if(_player.location.type === 'map' && _player.location.map === map) {
      doFunc(_player);
    }
  });
};

Game.prototype.doOnMapPlayersAt = function(map, x, y, doFunc) {
  this.players.forEach(function(_player) {
    if(_player.location.type === 'map' && _player.location.map === map) {
      if(_player.location.x === x && _player.location.y === y) {
        doFunc(_player);
      }
    }
  });
};

Game.prototype.removePlayerFromMap = function(player, oldMapName) {
  this.players.forEach(function(_player) {
    if(_player.location.type === 'map' && _player.location.map === oldMapName) {
      _player.socket.emit('playerRemove', {
        id: player.socketId,
        username: player.username
      });
    }
  });
};

Game.prototype.updateSurroundingPlayers = function(player) {
  this.doOnSurroundingPlayers(player, 100, false, function(_player) {
    _player.socket.emit('playerUpdate', {
      id: player.socketId,
      username: player.username,
      map: player.location.map,
      x: player.location.x,
      y: player.location.y,
      style: player.getStyle()
    });
  });
};

Game.prototype.getSurroundingPlayers = function(player) {
  this.doOnSurroundingPlayers(player, 100, false, function(_player) {
    player.socket.emit('playerUpdate', {
      id: _player.socketId,
      username: _player.username,
      map: _player.location.map,
      x: _player.location.x,
      y: _player.location.y,
      style: _player.getStyle()
    });
  });
};

Game.prototype.sayToSurroundingPlayers = function(player, sayText) {
  this.doOnSurroundingPlayers(player, 100, true, function(_player) {
    _player.socket.emit('mapSay', {
      id: player.socketId,
      username: player.username,
      style: player.getStyle(),
      text: sayText
    });
  });
};

Game.prototype.mapUpdate = function(player, locationData, symbol, obj) {
  this.doOnMapPlayers(player, false, function(_player) {
    _player.socket.emit('mapUpdate', {
      x: locationData.x,
      y: locationData.y,
      symbol: symbol,
      obj: obj || null
    });
  });
};

Game.prototype.mapUpdateDelete = function(player, locationData, obj) {
  this.doOnMapPlayers(player, false, function(_player) {
    _player.socket.emit('mapDelete', {
      x: locationData.x - 1,
      y: locationData.y,
      obj: obj || null
    });
  });
};

Game.prototype.mapUpdateWall = function(player, wallData) {
  this.doOnMapPlayers(player, false, function(_player) {
    _player.socket.emit('mapWall', {
      x: wallData.x,
      y: wallData.y,
      wall: wallData.wall
    });
  });
};

Game.prototype.mapUpdateColor = function(player, colorData) {
  this.doOnMapPlayers(player, false, function(_player) {
    _player.socket.emit('mapColor', {
      x: colorData.x,
      y: colorData.y,
      color: colorData.color
    });
  });
};

export default Game;