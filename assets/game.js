var socket = io();
var MMO = angular.module('asciimmo', ['ng']);

$(document).ready(function() {
  $('#input-controller input').focus();
});

MMO.controller('BodyController', function($rootScope) {

  $rootScope.logHtml = 'Welcome to AsciiMMO.com!<br>';

  $rootScope.addLine = function(line) {
    $rootScope.logHtml += line + '<br>';
    $rootScope.$digest();
    $('#log-controller').scrollTop($('#log-controller').prop("scrollHeight"));
  };

  console.log('Welcome to AsciiMMO!');
});

MMO.controller('MapController', function($rootScope, $scope, $sce, $rooms, $player, $sound, $utils, $timeout) {

  $scope.mapRenderAvailable = false;
  $scope.showSpecial = false;

  $scope.viewportX = Math.floor($(window).width() / 30); // Monospace font size
  $scope.viewportY = Math.floor($(window).height() / 65); // Monspace font size

  $scope.players = [];
  $scope.lastMovement = Date.now();

  $sound.preload();

  socket.on('loggedIn', function(loginData) {
    $scope.id = loginData.id;
    $scope.username = loginData.username;

    $player.setCanDraw(loginData.canEdit);
    $player.setStyle(loginData.style);

    $rootScope.addLine('You have logged in as \'' + $scope.username + '\'!');
  });

  socket.on('mapRender', function(mapData) {
    $rootScope.addLine('You have entered \'' + mapData.name + '\'!');
    $scope.mapRenderAvailable = true;
    $rooms.load(mapData.rooms, mapData.objects).initObjectRendering();
    $player.setxy(mapData.locationX, mapData.locationY);
    $player.setMap(mapData.name);
    $scope.render();
    $scope.$digest();
    $scope.startAnimations();
    $utils.destroyChatBubbles();
    $sound.playSoundEffect('newarea');
  });

  socket.on('playerUpdate', function(updateData) {
    var playerObj = _.findWhere($scope.players, { username: updateData.username });
    if(playerObj) {
      playerObj.x = updateData.x;
      playerObj.y = updateData.y;
      playerObj.map = updateData.map;
      playerObj.id = updateData.id;
      playerObj.style = updateData.style;
    } else {
      $scope.players.push(updateData);
    }

    $scope.render();
    $scope.$digest();

    if(!playerObj) {
      $timeout(function() {
        $('.map-you[data-id="' + updateData.id + '"]').hide().fadeIn();
      });
    }
  });

  socket.on('playerRemove', function(removeData) {
    var playerObj = _.findWhere($scope.players, { username: removeData.username });
    var render = false;

    if(playerObj) {
      if( Math.abs(playerObj.x - $player.x()) < 100 && Math.abs(playerObj.y - $player.y()) < 100) {
        render = true;
      }

      $scope.players.splice($scope.players.indexOf(playerObj), 1);
    }

    if(render) {
      $('.map-you[data-id="' + removeData.id + '"]').fadeOut(function() {
        $scope.render();
        $scope.$digest();
      });
    }
  });

  socket.on('playerMovement', function(movementData) {
    $player.setxy(movementData.x, movementData.y);
    $scope.render();
    $scope.$digest();
  });

  socket.on('text', function(text) {
    $rootScope.addLine(text);
  });

  socket.on('editingObject', function(editingData) {
    $player.setEditingObject(editingData.obj);
  });

  socket.on('objectMove', function(objectMoveData) {
    $rooms.moveObject(objectMoveData.name, objectMoveData.x, objectMoveData.y);
    $rooms.initObjectRendering();

    $scope.render();
    $scope.$digest();
  });

  socket.on('objectCreate', function(objectCreation) {
    $rooms.createObject(objectCreation);
    $rooms.initObjectRendering();

    $scope.render();
    $scope.$digest();
  });

  socket.on('objectDelete', function(objectDeletion) {
    $rooms.deleteObject(objectDeletion.name);
    $rooms.initObjectRendering();
  });

  socket.on('mapUpdate', function(updateData) {
    if(!updateData.obj) {
      $rooms.x(updateData.x).y(updateData.y).get().symbol = updateData.symbol;
    } else {
      $rooms.addSymbolToObject(updateData.obj, updateData.x, updateData.y, updateData.symbol);
      $rooms.initObjectRendering();
    }

    $scope.render();
    $scope.$digest();
  });

  socket.on('mapDelete', function(updateData) {
    if(!updateData.obj) {
      if($rooms.check(updateData.x, updateData.y)) {
        $rooms.x(updateData.x).y(updateData.y).destroy();
      }
    } else {
      $rooms.removeRoomFromObject(updateData.obj, updateData.x, updateData.y);
      $rooms.initObjectRendering();
    }

    $scope.render();
    $scope.$digest();
  });

  socket.on('mapWall', function(wallData) {
    var room = $rooms.x(wallData.x).y(wallData.y).get();

    room.wall = wallData.wall;
  });

  socket.on('mapColor', function(colorData) {
    var room = $rooms.x(colorData.x).y(colorData.y).get();

    room.color = colorData.color;

    $scope.render();
    $scope.$digest();
  });

  socket.on('mapSay', function(sayData) {
    $utils.chatBubble(sayData.id, sayData.text);

    $sound.playSoundEffect('chatmsg');

    $rootScope.addLine("<span style='" + sayData.style + "'>" + sayData.username.substr(0, 1).toUpperCase() + "</span>&nbsp;" + sayData.username + ": " + sayData.text);
  });

  socket.on('mapAnimation', function(animationData) {
    $rooms.x(animationData.x).y(animationData.y).get().animation = animationData.animation;

    $rooms.x(animationData.x).y(animationData.y).updateAnimation();

    $scope.render();
    $scope.$digest();
  });

  socket.on('mapLink', function(linkData) {
    $rooms.x(linkData.x).y(linkData.y).get().link = linkData.link;

    $scope.render();
    $scope.$digest();
  });

  socket.on('mapFlag', function(flagData) {
    $rooms.x(flagData.x).y(flagData.y).get().flags = flagData.flags;
  });

  $(window).resize(function() {
    $scope.viewportX = Math.floor($(window).width() / 30);
    $scope.viewportY = Math.floor($(window).height() / 65);
    $scope.$digest();
  });

  $(document).on('click', '.map-you', function() {
    console.log('Clicked a person.');
  });

  $(document).on('keydown', function(evt) {
    if($rootScope.inputIsFocused) {
      return;
    }

    if(evt.keyCode === 8) {
      evt.preventDefault();
    }

    if(evt.keyCode === 16 && $player.canDraw()) {
      $scope.showSpecial = true;
      $scope.render();
      $scope.$digest();
    }

    // Movement delay?
    if((Date.now() - $scope.lastMovement) < 50) {
      return;
    }

    $scope.lastMovement = Date.now();

    var x = $player.x();
    var y = $player.y();

    switch(evt.keyCode) {
      case 39: // down
        x++;
        break;
      case 38: // up
        y--;
        break;
      case 37: // left
        x--;
        break;
      case 40: // right
        y++;
        break;
      default:
        if($rootScope.inputIsFocused) {
          return;
        }
        $scope.draw(evt.shiftKey, evt.ctrlKey, evt.keyCode);
        return;
    }

    // Wall (hit wall unless going into object)?
    if($rooms.check(x, y) && $rooms.x(x).y(y).get().wall === true) {
      if(!($player.canDraw() && evt.shiftKey) && !$rooms.getObjectDataAt(x, y)) {
        return;
      }
    }

    // In an object?
    if($rooms.getObjectDataAt($player.x(), $player.y())) {
      // Moving outside of object?
      if(!$rooms.getObjectDataAt(x, y)) {
        // Contains 'objectexit' flag?
        if(!$rooms.x(x).y(y).hasFlag('objectexit') && !($player.canDraw() && evt.shiftKey)) {
          return;
        }
      }
    }

    // Update loc
    $player.setxy(x, y);

    socket.emit('location', {
      x: $player.x(),
      y: $player.y(),
      shiftKey: evt.shiftKey
    });

    $sound.playSoundEffect('step');

    $scope.render();
    $scope.$digest();
  });

  $(document).on('keyup', function(evt) {
    if(!$scope.mapRenderAvailable) {
      return;
    }

    if(evt.keyCode === 16 && $scope.showSpecial) {
      $scope.showSpecial = false;
      $scope.render();
      $scope.$digest();
      return;
    }
  });

  $scope.draw = function(shiftKey, ctrlKey, keyCode) {
    if(!$player.canDraw()) {
      return;
    }

    // Special key: backspace (delete a room)
    if(keyCode === 8) {
      if(!$player.getEditingObject()) {
        if($rooms.check($player.x() - 1, $player.y())) {
          $rooms.x($player.x() - 1).y($player.y()).destroy();
        }
      } else {
        $rooms.removeRoomFromObject($player.getEditingObject(), $player.x() - 1, $player.y());
        $rooms.initObjectRendering();
      }

      socket.emit('mapDelete', {
        x: $player.x() - 1,
        y: $player.y()
      });

      $player.setxy($player.x() - 1, $player.y());
      $scope.$digest();
      return;
    }

    // Special key: w (flag as a wall)
    if(keyCode === 87) {
      var room = $rooms.check($player.x(), $player.y());
      if(room) {
        if(room.wall === true) {
          room.wall = false;
        } else {
          room.wall = true;
        }

        socket.emit('mapWall', {
          x: $player.x(),
          y: $player.y(),
          wall: room.wall
        });

        console.log('Set current location wall to', room.wall);
      }
      return;
    }

    // Special key: ctrl + [0-9] (set color)
    if(ctrlKey && keyCode >= 48 && keyCode <= 57) {
      var room = $rooms.check($player.x(), $player.y());
      if(room) {
        if(keyCode === 48) {
          room.color = '';
        } else {
          room.color = $scope.drawTable(false, keyCode);
        }

        socket.emit('mapColor', {
          x: $player.x(),
          y: $player.y(),
          color: room.color
        });

        if(room.color) {
          $rootScope.addLine('Room has been set to <span class="colors color-' + room.color + '">THIS COLOR</span>.');
        } else {
          $rootScope.addLine('Room color has been removed.');
        }
      } else {
        $rootScope.addLine('Cannot set color here. There is no room here.');
      }

      return;
    }

    // Special key: enter (toggle input)
    if(keyCode === 13) {
      $('#input-controller input').attr('disabled', false);
      $('#input-controller input').focus();
      return;
    }

    var drawSymbol = $scope.drawTable(shiftKey, keyCode);

    if(drawSymbol !== null) {
      if(!$player.getEditingObject()) {
        $rooms.x($player.x()).y($player.y()).get().symbol = drawSymbol;
      } else {
        $rooms.addSymbolToObject($player.getEditingObject(), $player.x(), $player.y(), drawSymbol);
        $rooms.initObjectRendering();
      }

      socket.emit('mapDraw', {
        x: $player.x(),
        y: $player.y(),
        symbol: drawSymbol
      });

      $player.setxy($player.x() + 1, $player.y());
      $scope.$digest();
    }
  };

  $scope.drawTable = function(shiftKey, keyCode) {
    switch(keyCode) {
      case 192: return ((!shiftKey) ? '`' : '~');
      case 49: return ((!shiftKey) ? '1' : '!');
      case 50: return ((!shiftKey) ? '2' : '@');
      case 51: return ((!shiftKey) ? '3' : '#');
      case 52: return ((!shiftKey) ? '4' : '$');
      case 53: return ((!shiftKey) ? '5' : '%');
      case 54: return ((!shiftKey) ? '6' : '^');
      case 55: return ((!shiftKey) ? '7' : '&');
      case 56: return ((!shiftKey) ? '8' : '*');
      case 57: return ((!shiftKey) ? '9' : '(');
      case 48: return ((!shiftKey) ? '0' : ')');
      case 189: return ((!shiftKey) ? '-' : '_');
      case 187: return ((!shiftKey) ? '=' : '+');
      case 190: return ((!shiftKey) ? '.' : '>');
      case 188: return ((!shiftKey) ? ',' : '<');
      case 191: return ((!shiftKey) ? '/' : '?');
      case 219: return ((!shiftKey) ? '[' : '{');
      case 221: return ((!shiftKey) ? ']' : '}');
      case 220: return ((!shiftKey) ? '\\' : '|');
      case 88: return ((!shiftKey) ? 'x' : 'X');
      default:
        console.log(shiftKey, keyCode);
        return null;
    }
  };

  $scope.$watch(function() {
    return $player.x().toString() + ',' + $player.y().toString();
  }, function() {
    if($scope.mapRenderAvailable) {
      console.log('#######');
      console.log('- Location:', $player.x(), $player.y());
      if($rooms.check($player.x(), $player.y())) {
        console.log(':: Wall', $rooms.x($player.x()).y($player.y()).get().wall);
        console.log(':: Animation', $rooms.x($player.x()).y($player.y()).get().animation);
        console.log(':: Link', $rooms.x($player.x()).y($player.y()).get().link);
        console.log(':: Color', $rooms.x($player.x()).y($player.y()).get().color);
        console.log(':: Flags', $rooms.x($player.x()).y($player.y()).get().flags);
      }

      $scope.render();
    }
  });

  $scope.$watchGroup(['viewportX', 'viewportY'], function() {
    if($scope.mapRenderAvailable) {
      console.log('Location:', $player.x(), $player.y());
      console.log((($rooms.check($player.x(), $player.y())) ? 'Wall: ' + $rooms.x($player.x()).y($player.y()).get().wall : 'Wall: false'));
      console.log((($rooms.check($player.x(), $player.y())) ? 'Animation: ' + $rooms.x($player.x()).y($player.y()).get().animation : 'Animation:'));

      $scope.render();
    }
  });

  $scope.render = function() {
    // Clear animation timers
    if($scope.animationTimers) {
      $scope.animationTimers.forEach(clearInterval);
    }

    $scope.animationTimers = [];

    // Render!
    var _html = '';
    for(var y = $player.y() - $scope.viewportY; y < ($player.y() + $scope.viewportY); y++) {
      for(var x = $player.x() - $scope.viewportX; x < ($player.x() + $scope.viewportX); x++) {
        var playerHere = _.findWhere($scope.players, { x: x, y: y, map: $player.map() });
        var objectDataHere = $rooms.getObjectDataAt(x, y);
        if(x === $player.x() && y === $player.y()) {
          _html += '<span class="map-you" data-id="' + $scope.id + '" style="' + $player.getStyle() + '">' + $scope.username.substr(0,1).toUpperCase() + '</span>';
        } else if(playerHere) {
          _html += '<span class="map-you" data-id="' + playerHere.id + '" style="' + playerHere.style + '">' + playerHere.username.substr(0,1).toUpperCase() + '</span>';
        } else if(objectDataHere) {
          if($scope.showSpecial) {
          _html += '<span style="color:#fff;background-color:#009">' + (objectDataHere.symbol || ' ') + '</span>' ;
          } else {
            _html += objectDataHere.symbol || ' ';
          }
        } else if($rooms.check(x, y)) {
          if($rooms.x(x).y(y).get().animation) {
            _html += $rooms.x(x).y(y).initAnimation();
          } else {
            if($scope.showSpecial) {
              var _style = '';
              if($rooms.x(x).y(y).get().wall) { _style += 'color:#f00'; }
              if($rooms.x(x).y(y).get().link) { _style += 'background-color:#000;color:#fff'; }
              _html += '<span style="' + _style + '" class="colors color-' + ($rooms.x(x).y(y).get().color || '0') + '">' + ($rooms.x(x).y(y).get().symbol || ' ') + '</span>';
            } else {
              if($rooms.x(x).y(y).get().color) {
                _html += '<span class="colors color-' + $rooms.x(x).y(y).get().color + '">' + ($rooms.x(x).y(y).get().symbol || ' ') + '</span>';
              } else {
                _html += $rooms.x(x).y(y).get().symbol || ' ';
              }
            }
          }
        } else {
          _html += ' ';
        }
      }
      _html += '<br>';
    }

    $scope.viewport = $sce.trustAsHtml( _html );
  };

  $scope.animationInterval = 0;
  $scope.startAnimations = function() {
    if($scope.animationInterval !== 0) {
      return;
    }

    setInterval(function() {
      $scope.animationInterval += 200;

      if($scope.animationInterval > 2000) {
        $scope.animationInterval = 200;
      }

      $rooms.runAnimationsAtInterval($scope.animationInterval);
    }, 200);
  };


});

MMO.controller('StatsController', function($rootScope, $scope, $sce) {

});

MMO.controller('LogController', function($rootScope, $scope, $sce) {
  $rootScope.$watch('logHtml', function() {
    $scope.html = $sce.trustAsHtml($rootScope.logHtml);
  });
});

MMO.controller('InputController', function($rootScope, $scope) {
  $scope.setInputFocus = function(focused) {
    $rootScope.inputIsFocused = focused;
  };

  $scope.onKeyUp = function(evt) {
    if(evt.keyCode === 13) {
      if(!$scope.inputText) {
        return;
      }

      if($scope.inputText.substr(0, 7) === '/login ') {
        socket.emit('login', {
          username: $scope.inputText.substr(7)
        });
      } else {
        if($scope.inputText.substr(0, 1) === '/') {
          socket.emit('runCommand', {
            cmd: $scope.inputText.substr(1)
          });
        } else {
          socket.emit('mapSay', {
            text: $scope.inputText
          });
        }
      }

      $scope.inputText = '';
      evt.preventDefault();
    }
  };

  $scope.onClick = function() {
    $('#input-controller input').attr('disabled', false);
    $('#input-controller input').focus();
  };
});

MMO.factory('$rooms', function() {
  var rooms = [];
  var objects = [];
  var objectRendering = [];
  var lastx;
  var lasty;
  var animationTimers = [];

  return {
    load: function(_rooms, _objects) {
      // load roams
      delete rooms;
      rooms = [];

      _rooms.forEach(function(_room) {
        if(!rooms[_room.x]) {
          rooms[_room.x] = [];
        }

        rooms[_room.x][_room.y] = _room;
      });

      // store objects
      objects = _objects || [];

      return this;
    },

    check: function(x, y) {
      if(rooms[x] && rooms[x][y]) {
        return rooms[x][y];
      } else {
        return false;
      }
    },

    x: function(x) {
      if(!rooms[x]) {
        rooms[x] = [];
      }

      lastx = x;

      return this;
    },

    y: function(y) {
      if(!rooms[lastx][y]) {
        rooms[lastx][y] = {};
      }

      lasty = y;

      return this;
    },

    get: function() {
      return rooms[lastx][lasty];
    },

    destroy: function() {
      delete rooms[lastx][lasty];
      return this;
    },

    hasFlag: function(flag) {
      if(!rooms[lastx][lasty].flags || rooms[lastx][lasty].flags.indexOf(flag) === -1) {
        return false;
      } else {
        return true;
      }
    },

    initObjectRendering: function() {
      objectRendering = [];

      objects.forEach(function(_obj) {
        _obj.rooms.forEach(function(_objRoom) {
          var x = _obj.x + _objRoom.x;
          var y = _obj.y + _objRoom.y;

          if(!objectRendering[x]) { objectRendering[x] = []; }

          objectRendering[x][y] = _objRoom;
          objectRendering[x][y].parentObject = _obj;
        });
      });

      return this;
    },

    createObject: function(obj) {
      objects.push(obj);
    },

    deleteObject: function(objName) {
      var obj = _.findWhere(objects, { name: objName });
      if(obj) {
        objects.splice(objects.indexOf(obj), 1);
      }
    },

    getObjectDataAt: function(x, y) {
      if(objectRendering[x] && objectRendering[x][y]) {
        return objectRendering[x][y];
      } else {
        return null;
      }
    },

    addSymbolToObject: function(objectName, x, y, symbol) {
      var objHere = _.findWhere(objects, { name: objectName });
      var roomExists = _.findWhere(objHere.rooms, { x: (x - objHere.x), y: (y - objHere.y) });
      if(roomExists) {
        roomExists.symbol = symbol;
      } else {
        objHere.rooms.push({
          x: (x - objHere.x),
          y: (y - objHere.y),
          symbol: symbol
        });
      }
    },

    removeRoomFromObject: function(objectName, x, y) {
      var objHere = _.findWhere(objects, { name: objectName });
      var roomExists = _.findWhere(objHere.rooms, { x: (x - objHere.x), y: (y - objHere.y) });
      if(roomExists) {
        objHere.rooms.splice(objHere.rooms.indexOf(roomExists, 1));
      }
    },

    moveObject: function(objectName, x, y) {
      var objHere = _.findWhere(objects, { name: objectName });
      if(objHere) {
        objHere.x = x;
        objHere.y = y;
      }
    },

    initAnimation: function() {
      if(!animationTimers[lastx] || !animationTimers[lastx][lasty]) {
        // Let's initialize the timer
        if(!animationTimers[lastx]) { animationTimers[lastx] = []; }
        animationTimers[lastx][lasty] = { animationSequence: this.get().animation.split(' ')[1].toString(), animationColors: (this.get().animation.split(' ')[2] || '').toString(), animationIndex: 0, interval: parseInt(this.get().animation.split(' ')[0]), sync: false };
        // Prepare the span
        return '<span class="colors color-' + ((animationTimers[lastx][lasty].animationColors) ? animationTimers[lastx][lasty].animationColors.substr(0, 1) : '0') + '" data-x="' + lastx + '" data-y="' + lasty + '">' + animationTimers[lastx][lasty].animationSequence.substr(0, 1).replace('B', ' ') + '</span>';
      } else {
        // A timer already exists
        var currentIndex = animationTimers[lastx][lasty].animationIndex;
        if(currentIndex === -1) { currentIndex = 0; }
        return '<span class="colors color-' + ((animationTimers[lastx][lasty].animationColors) ? animationTimers[lastx][lasty].animationColors.substr(currentIndex, 1) : '0') + '" data-x="' + lastx + '" data-y="' + lasty + '">' + animationTimers[lastx][lasty].animationSequence.substr(currentIndex, 1).replace('B', ' ') + '</span>';
      }
    },

    updateAnimation: function() {
      if(animationTimers[lastx] && animationTimers[lastx][lasty]) {
        animationTimers[lastx][lasty].animationSequence = this.get().animation.split(' ')[1].toString();
        animationTimers[lastx][lasty].animationColors = (this.get().animation.split(' ')[2] || '').toString();
        animationTimers[lastx][lasty].sync = false;
      }
    },

    runAnimationsAtInterval: function(interval, reset) {
      for(var x in animationTimers) {
        for(var y in animationTimers[x]) {
          if(interval % animationTimers[x][y].interval === 0) {
            // Flagged for deletion?
            if(animationTimers[x][y].flagForDeletion === true) {
              delete animationTimers[x][y];
              continue;
            }
            // If it hasn't ran yet, let's reset all the animation indexes to keep everything in-sync
            if(animationTimers[x][y].sync === false && reset !== true) {
              for(var _x in animationTimers) {
                for(var _y in animationTimers[_x]) {
                  animationTimers[_x][_y].animationIndex = -1;
                }
              }
              animationTimers[x][y].sync = true;
              return this.runAnimationsAtInterval(interval, true);
            } else if(animationTimers[x][y].sync === false && reset === true) {
              animationTimers[x][y].sync = true;
            }

            var animationSequence = animationTimers[x][y].animationSequence;
            var animationColors = animationTimers[x][y].animationColors;
            var animationIndex = animationTimers[x][y].animationIndex;

            if(animationIndex < animationSequence.length - 1) {
              animationIndex++;
            } else {
              animationIndex = 0;
            }

            if($('[data-x="'+x+'"][data-y="'+y+'"]').length === 1) {
              $('[data-x="'+x+'"][data-y="'+y+'"]').html(animationSequence.substr(animationIndex, 1).replace('B', ' '));

              for(var i = 0; i <= 9; i++) {
                $('[data-x="'+x+'"][data-y="'+y+'"]').removeClass('color-' + i);
              }

              $('[data-x="'+x+'"][data-y="'+y+'"]').addClass('color-' + ((animationColors) ? animationColors.substr(animationIndex, 1) : '0' ) );

              animationTimers[x][y].animationIndex = animationIndex;
            } else {
              animationTimers[x][y].flagForDeletion = true;
            }
          }
        }
      }
    }

  };
});

MMO.factory('$player', function() {
  var _x = 0;
  var _y = 0;
  var _style = '';
  var _canDraw = false;
  var _map = '';
  var _editingObj = null;

  return {
    setxy: function(x, y) {
      _x = parseInt(x);
      _y = parseInt(y);
    },

    x: function() {
      return _x;
    },

    y: function() {
      return _y;
    },

    setStyle: function(style) {
      _style = style;
    },

    getStyle: function() {
      return _style;
    },

    setMap: function(mapName) {
      _map = mapName;
    },

    map: function() {
      return _map;
    },

    setCanDraw: function(canDraw) {
      _canDraw = canDraw;
    },

    canDraw: function() {
      return _canDraw;
    },

    setEditingObject: function(obj) {
      _editingObj = obj;
    },

    getEditingObject: function() {
      return _editingObj;
    },
  };
});

MMO.factory('$sound', function() {
  return {
    preload: function() {
      console.log('Preloading sounds..');
      createjs.Sound.registerSound("assets/sounds/chat_message.wav", "chatmsg");
      createjs.Sound.registerSound("assets/sounds/step.wav", "step");
      createjs.Sound.registerSound("assets/sounds/new_area.wav", "newarea");
    },

    playSoundEffect: function(sfx) {
      createjs.Sound.play(sfx);
    }
  };
});

MMO.factory('$utils', function() {
  return {
    chatBubble: function(playerId, text) {
      var currentPosition = $('[data-id="' + playerId + '"]').position();

      var topOffset = currentPosition.top - 25;
      var leftOffset = currentPosition.left - 10;

      $('body').append('<div class="chat-bubble animated fadeOutUp" data-playerid="' + playerId + '" style="top:' + topOffset + ';left:' + leftOffset + '">' + text + '</div>');
    },

    destroyChatBubbles: function() {
      $('.chat-bubble').remove();
    }
  }
});