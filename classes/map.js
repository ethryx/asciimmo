var _ = require('underscore');

function Map(name) {
  this.name = name || 'Unknown';
  this.rooms = [
    { x: 1, y: 0, symbol: '#' },
  ];
}

Map.prototype.load = function(cfg) {
  this.name = cfg.name;
  this.rooms = cfg.rooms;
  return this;
};

Map.prototype.draw = function(drawData) {
  var existingRoom = _.findWhere(this.rooms, { x: drawData.x, y: drawData.y });

  if(existingRoom) {
    existingRoom.symbol = drawData.symbol;
  } else {
    this.rooms.push(drawData);

  }
};

Map.prototype.undraw = function(undrawData) {
  var existingRoom = _.findWhere(this.rooms, { x: undrawData.x, y: undrawData.y });
  if(existingRoom) {
    var existingRoomIndex = this.rooms.indexOf(existingRoom);
    this.rooms.splice(existingRoomIndex, 1);
  }
};

Map.prototype.wall = function(wallData) {
  var existingRoom = _.findWhere(this.rooms, { x: wallData.x, y: wallData.y });
  if(existingRoom) {
    existingRoom.wall = wallData.wall;
  }
};

Map.prototype.setAnimation = function(animationData) {
  var existingRoom = _.findWhere(this.rooms, { x: animationData.x, y: animationData.y });
  if(existingRoom) {
    existingRoom.animation = animationData.animation;
  } else {
    this.rooms.push(animationData);
  }
};

Map.prototype.setLink = function(linkData) {
  var existingRoom = _.findWhere(this.rooms, { x: linkData.x, y: linkData.y });
  if(existingRoom) {
    existingRoom.link = linkData.link;
  } else {
    this.rooms.push(linkData);
  }
};

Map.prototype.getRoom = function(x, y) {
  var existingRoom = _.findWhere(this.rooms, { x: x, y: y });
  return existingRoom;
};

module.exports = Map;