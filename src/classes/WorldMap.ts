var _ = require('underscore');

//#region WorldMap Interfaces
interface IRoomGeneric {
  x: number,
  y: number,
}

interface IRoomDrawData extends IRoomGeneric {
  symbol?: string,
}

interface IRoomWall extends IRoomGeneric {
  wall: boolean
}

interface IRoomColor extends IRoomGeneric {
  color: string
}

interface IRoomAnimation extends IRoomGeneric {
  animation: string
}

interface ILink {
  map: string,
  x: number,
  y: number
}

interface IRoomLink extends IRoomGeneric {
  link: ILink
}

interface IRoomFlag extends IRoomGeneric {
  flag: string
}

interface IRoom extends IRoomGeneric {
  symbol?: string,
  flags?: Array<string>,
  wall?: boolean,
  color?: string,
  animation?: string,
  link?: ILink
}

interface IRoomObject {
  name: string,
  x: number,
  y: number,
  rooms?: Array<IRoom>
}

interface IWorldMapSaveConfig {
  name: string,
  title: string,
  rooms: Array<IRoom>,
  objects: Array<IRoomObject>
}
//#endregion WorldMap Interfaces

class WorldMap {
  private name: string;
  private title: string;
  private rooms: Array<IRoom>;
  private objects: Array<IRoomObject>;

  constructor(mapName?: string) {
    this.name = mapName || 'Unknown';
    this.title = 'Untitled Area';
    this.rooms = [
      { x: 1, y: 0, symbol: '#' },
    ];
    this.objects = [];
  }

  public getName(): string {
    return this.name
  }

  public getTitle(): string {
    return this.title
  }

  public getRooms(): Array<IRoom> {
    return this.rooms;
  }

  public getObjects(): Array<IRoomObject> {
    return this.objects;
  }
  
  public load(cfg: IWorldMapSaveConfig): void {
    this.name = cfg.name;
    this.rooms = cfg.rooms;
    this.objects = cfg.objects;
    this.title = cfg.title;
  };

  public draw(drawData: IRoomDrawData, objectName: string): void {
    if(objectName) {
      var obj = _.findWhere(this.objects, { name: objectName });
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
  
  public undraw(undrawData: IRoomGeneric, forObject, funcOnObjectDelete): void {
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
  
  public wall(wallData: IRoomWall): void {
    var existingRoom = _.findWhere(this.rooms, { x: wallData.x, y: wallData.y });
    if(existingRoom) {
      existingRoom.wall = wallData.wall;
    }
  };
  
  public color(colorData: IRoomColor): void {
    var existingRoom = _.findWhere(this.rooms, { x: colorData.x, y: colorData.y });
    if(existingRoom) {
      existingRoom.color = colorData.color;
    }
  };
  
  public setMapTitle(newMapTitle: string): void {
    this.title = newMapTitle;
  };
  
  public setAnimation(animationData: IRoomAnimation): void {
    var existingRoom = _.findWhere(this.rooms, { x: animationData.x, y: animationData.y });
    if(existingRoom) {
      existingRoom.animation = animationData.animation;
    } else {
      this.rooms.push(animationData);
    }
  };
  
  public setLink(linkData: IRoomLink): void {
    var existingRoom = _.findWhere(this.rooms, { x: linkData.x, y: linkData.y });
    if(existingRoom) {
      existingRoom.link = linkData.link;
    } else {
      this.rooms.push(linkData);
    }
  };
  
  public toggleFlag(flagData: IRoomFlag): Array<string> {
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
  
  public getRoom(x: number, y: number): IRoom {
    var existingRoom = _.findWhere(this.rooms, { x: x, y: y });
    return existingRoom;
  };
  
  public createObject(objectName: string, x: number, y: number): IRoomObject {
    var objExists = _.findWhere(this.objects, { name: objectName });
    if(!objExists) {
      if(!this.objects) {
        this.objects = [];
      }
      var newObject = {
        x: x,
        y: y,
        name: objectName,
        rooms: [{ x: 0, y: 0, symbol: '#' }]
      };
      this.objects.push(newObject);
      return newObject;
    } else {
      return null;
    }
  };
  
  public getObjectAt(x: number, y: number): IRoomObject {
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

}

export default WorldMap;
