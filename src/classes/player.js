var fs = require('fs');

function Player(socket, game) {
  this.socketId = socket.id;
  this.socket = socket;
  this.game = game;
}

Player.prototype.load = function(loginData, loadedCallback) {
  this.username = loginData.username;

  fs.readFile('./data/players/' + this.username, function(err, data) {
    if(err) {
      // New player
      console.log('New player loaded username=' + this.username);
      this.location = {
        type: 'map',
        map: 'World',
        x: 1,
        y: 1
      };
      this.backgroundColor = '#f00';
      this.canEdit = false;
    } else {
      // Existing player
      console.log('Existing player loaded username=' + this.username);
      var dataObj = JSON.parse(data);
      this.location = dataObj.location;
      this.backgroundColor = dataObj.backgroundColor || '#999';
      this.canEdit = dataObj.canEdit || false;
    }

    loadedCallback(this);
  }.bind(this));

  return this;
};

Player.prototype.save = function(doneCallback) {
  var saveData = {
    username: this.username,
    location: this.location,
    backgroundColor: this.backgroundColor,
    canEdit: this.canEdit
  };

  fs.writeFile('./data/players/' + this.username, JSON.stringify(saveData), doneCallback);
};

Player.prototype.getStyle = function() {
  var _style = '';

  if(this.canEdit) {
    _style += 'color:#900;border-bottom:3px solid #900;';
  } else {
    _style += 'color:#000;';
  }

  _style += 'background-color:' + this.backgroundColor;

  return _style;
};

Player.prototype.setBackgroundColor = function(bgColor) {
  this.backgroundColor = '#' + bgColor;
};

Player.prototype.renderMap = function(map, shouldCreate) {
  if(map === null && shouldCreate) {
    map = this.game.createNewMap(this.location.map);
  }

  this.socket.emit('mapRender', {
    name: map.name,
    title: map.title,
    rooms: map.rooms,
    objects: map.objects,
    locationX: this.location.x,
    locationY: this.location.y
  });
};

module.exports = Player;