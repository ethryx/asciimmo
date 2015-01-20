var _ = require('underscore');

function Map(name) {
  this.name = name || 'Unknown';
  this.rooms = [
    { x: 1, y: 0, symbol: '#' },
  ];
  this.objects = []; // { name: 'SomeObject', x: 0, y: 0, rooms: { x: 0, y: 0, symbol: '#' } }
}

Map.prototype.load = function(cfg) {
  this.name = cfg.name;
  this.rooms = cfg.rooms;
  this.objects = cfg.objects;
  return this;
};

Map.prototype.draw = function(drawData, forObject) {
  if(forObject) {
    var obj = _.findWhere(this.objects, { name: forObject });
    var objRoom = _.findWhere(obj.rooms, { x: (drawData.x - obj.x), y: (drawData.y - obj.y) });
    if(objRoom) {
      objRoom.symbol = drawData.symbol;
    } else {
      obj.rooms.push({
        x: (drawData.x - obj.x),
        y: (drawData.y - obj.y),
        symbol: drawData.symbol
      });
    }
    return;
  }

  var existingRoom = _.findWhere(this.rooms, { x: drawData.x, y: drawData.y });

  if(existingRoom) {
    existingRoom.symbol = drawData.symbol;
  } else {
    this.rooms.push(drawData);
  }
};

Map.prototype.undraw = function(undrawData, forObject, funcOnObjectDelete) {
  if(forObject) {
    var obj = _.findWhere(this.objects, { name: forObject });
    var objRoom = _.findWhere(obj.rooms, { x: (undrawData.x - obj.x), y: (undrawData.y - obj.y) });
    if(objRoom) {
      obj.rooms.splice(obj.rooms.indexOf(objRoom), 1);

      if(obj.rooms.length === 0) {
        this.objects.splice(this.objects.indexOf(obj), 1);
        funcOnObjectDelete();
      }
    }
    return;
  }

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

Map.prototype.color = function(colorData) {
  var existingRoom = _.findWhere(this.rooms, { x: colorData.x, y: colorData.y });
  if(existingRoom) {
    existingRoom.color = colorData.color;
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

Map.prototype.toggleFlag = function(flagData) {
  var existingRoom = _.findWhere(this.rooms, { x: flagData.x, y: flagData.y });
  if(existingRoom) {
    if(typeof existingRoom.flags === 'undefined') {
      existingRoom.flags = new Array(flagData.flag);
    } else {
      var flagIndex = existingRoom.flags.indexOf(flagData.flag);
      if(flagIndex === -1) {
        existingRoom.flags.push(flagData.flag);
      } else {
        existingRoom.flags.splice(flagIndex, 1);
      }
    }
    return existingRoom.flags;
  } else {
    var newRoom = {
      x: flagData.x,
      y: flagData.y,
      flags: new Array(flagData.flag)
    };
    this.rooms.push(newRoom);
    return newRoom.flags;
  }
};

Map.prototype.getRoom = function(x, y) {
  var existingRoom = _.findWhere(this.rooms, { x: x, y: y });
  return existingRoom;
};

Map.prototype.createObject = function(objectName, x, y) {
  var objExists = _.findWhere(this.objects, { name: objectName });
  if(!objExists) {
    var newObject = {
      x: x,
      y: y,
      name: objectName,
      rooms: [{ x: 0, y: 0, symbol: '#' }]
    };
    this.objects.push(newObject);
    return newObject;
  } else {
    return false;
  }
};

Map.prototype.getObjectAt = function(x, y) {
  for(var o = 0; o < this.objects.length; o++) {
    for(var r = 0; r < this.objects[o].rooms.length; r++) {
      var _x = this.objects[o].x + this.objects[o].rooms[r].x;
      var _y = this.objects[o].y + this.objects[o].rooms[r].y;
      if(_x === x && _y === y) {
        return this.objects[o];
      }
    }
  }

  return null;
};

module.exports = Map;