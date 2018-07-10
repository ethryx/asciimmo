import Player from "./Player";
import Server from "../Server";

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
  private rooms: Map<IRoomGeneric, IRoom>;
  private objects: Map<string, IRoomObject>;

  constructor(mapName?: string) {
    this.name = mapName || 'Unknown';
    this.title = 'Untitled Area';
    this.rooms = new Map();
    this.rooms.set({ x: 1, y: 0 }, { x: 1, y: 0, symbol: '#' });
    this.objects = new Map();
  }

  public getName(): string {
    return this.name
  }

  public getTitle(): string {
    return this.title
  }

  public getRooms(): Array<IRoom> {
    const rooms: Array<IRoom> = [];
    this.rooms.forEach(room => rooms.push(room));
    return rooms;
  }

  public getObjects(): Array<IRoomObject> {
    const objects: Array<IRoomObject> = [];
    this.objects.forEach(obj => objects.push(obj));
    return objects;
  }

  public loadFromConfig(config: IWorldMapSaveConfig): void {
    this.name = config.name;
    config.rooms.forEach(room => this.rooms.set({ x: room.x, y: room.y }, room));
    config.objects.forEach(obj => this.objects.set(obj.name, obj));
    this.title = config.title;
  };

  public saveToConfig(): IWorldMapSaveConfig {
    const rooms: Array<IRoom> = [];
    const objects: Array<IRoomObject> = [];

    this.rooms.forEach(room => rooms.push(room));
    this.objects.forEach(object => objects.push(object));

    return {
      name: this.name,
      rooms: rooms,
      objects: objects,
      title: this.title
    }
  }

  public draw(drawData: IRoomDrawData, objectName: string): void {
    if(objectName) {
      const obj = this.objects.get(objectName);
      const objRoom = this.rooms.get({ x: (drawData.x - obj.x), y: (drawData.y - obj.y) });
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
  
    const existingRoom = this.rooms.get({ x: drawData.x, y: drawData.y });

    if(existingRoom) {
      existingRoom.symbol = drawData.symbol;
    } else {
      this.rooms.set({ x: drawData.x, y: drawData.y }, drawData);
    }
  };
  
  public undraw(undrawData: IRoomGeneric, forObject: string, funcOnObjectDelete: Function): void {
    if(forObject) {
      const obj = this.objects.get(forObject);
      const objRoom = this.rooms.get({ x: (undrawData.x - obj.x), y: (undrawData.y - obj.y) });
      if(objRoom) {
        obj.rooms.splice(obj.rooms.indexOf(objRoom), 1);
  
        if(obj.rooms.length === 0) {
          this.objects.delete(forObject);
          funcOnObjectDelete();
        }
      }
      return;
    }
  
    if(this.rooms.get({ x: undrawData.x, y: undrawData.y })) {
      this.rooms.delete({ x: undrawData.x, y: undrawData.y });
    }
  };
  
  public wall(wallData: IRoomWall): void {
    const existingRoom = this.rooms.get({ x: wallData.x, y: wallData.y });
    if(existingRoom) {
      existingRoom.wall = wallData.wall;
    }
  };
  
  public color(colorData: IRoomColor): void {
    const existingRoom = this.rooms.get({ x: colorData.x, y: colorData.y });
    if(existingRoom) {
      existingRoom.color = colorData.color;
    }
  };
  
  public setMapTitle(newMapTitle: string): void {
    this.title = newMapTitle;
  };
  
  public setAnimation(animationData: IRoomAnimation): void {
    const existingRoom = this.rooms.get({ x: animationData.x, y: animationData.y });
    if(existingRoom) {
      existingRoom.animation = animationData.animation;
    } else {
      this.rooms.set({ x: animationData.x, y: animationData.y }, animationData);
    }
  };
  
  public setLink(linkData: IRoomLink): void {
    const existingRoom = this.rooms.get({ x: linkData.x, y: linkData.y });
    if(existingRoom) {
      existingRoom.link = linkData.link;
    } else {
      this.rooms.set({ x: linkData.x, y: linkData.y }, linkData);
    }
  };
  
  public toggleFlag(flagData: IRoomFlag): Array<string> {
    const existingRoom = this.rooms.get({ x: flagData.x, y: flagData.y });
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
      const newRoom: IRoom = {
        x: flagData.x,
        y: flagData.y,
        flags: new Array(flagData.flag)
      };
      this.rooms.set({ x: newRoom.x, y: newRoom.y }, newRoom);
      return newRoom.flags;
    }
  };
  
  public getRoom(x: number, y: number): IRoom {
    const existingRoom = this.rooms.get({ x: x, y: y });
    return existingRoom;
  };
  
  public createObject(objectName: string, x: number, y: number): IRoomObject {
    const objExists = this.objects.get(objectName);
    if(!objExists) {
      const newObject: IRoomObject = {
        x: x,
        y: y,
        name: objectName,
        rooms: [{ x: 0, y: 0, symbol: '#' }]
      };
      this.objects.set(newObject.name, newObject);
      return newObject;
    } else {
      return null;
    }
  };
  
  // TODO: Rename this?
  public getObjectAt(x: number, y: number): IRoomObject {
    const objects: Array<IRoomObject> = [];

    this.objects.forEach(obj => objects.push(obj));

    for(var o = 0; o < objects.length; o++) {
      for(var r = 0; r < objects[o].rooms.length; r++) {
        var _x = objects[o].x + objects[o].rooms[r].x;
        var _y = objects[o].y + objects[o].rooms[r].y;
        if(_x === x && _y === y) {
          return objects[o];
        }
      }
    }
  
    return null;
  };

  public getPlayersWithinRadius(x: number, y: number, radius: number): Array<Player> {
    return Server.playerManager.getPlayers().filter(player => {
      return (
        player.getLocation().type === 'map' &&
        player.getLocation().map === this.getName() &&
        Math.abs(x - player.getLocation().x) < radius &&
        Math.abs(y - player.getLocation().y) < radius
      );
    });
  }
}

export default WorldMap;
export { IWorldMapSaveConfig };
