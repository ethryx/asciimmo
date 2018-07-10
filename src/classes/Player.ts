import WorldMap from './WorldMap';
import { Socket } from 'socket.io';
import Server from '../Server';
import * as ISocketEvents from './interfaces/ISocketEvents';

//#region Player Interfaces
interface ILocation {
  type: string,
  map: string,
  x: number,
  y: number
}

interface IPlayerSaveConfig {
  username: string,
  location: ILocation,
  backgroundColor: string,
  canEdit: boolean
}
//#endregion Player Interfaces

class Player {
  private socket: Socket;
  private username: string;
  private backgroundColor: string;
  private canEdit: boolean;
  private location: ILocation;

  constructor(username: string, socket: Socket) {
    this.socket = socket;
    this.username = username;
    this.backgroundColor = '#f00';
    this.location = {
      type: 'map',
      map: 'World',
      x: 1,
      y: 1
    };
    this.canEdit = false;
  }

  public getSocketId(): string {
    return this.socket.id
  }

  public getUsername(): string {
    return this.username;
  }

  public getLocation(): ILocation {
    return this.location;
  }

  public getCanEdit(): boolean {
    return this.canEdit;
  }

  public getMap(): WorldMap {
    return Server.worldManager.getMap(this.location.map);
  }

  public emit(eventName: string, data: any): void {
    this.socket.emit(eventName, data);
  }

  public loadFromConfig(config: IPlayerSaveConfig): void {
    this.username = config.username;
    this.location = config.location;
    this.backgroundColor = config.backgroundColor;
    this.canEdit = config.canEdit;
  }

  public saveToConfig(): IPlayerSaveConfig {
    return {
      username: this.username,
      location: this.location,
      backgroundColor: this.backgroundColor,
      canEdit: this.canEdit
    }
  }
  
  public getStyle(): string {
    var _style = '';
  
    if(this.canEdit) {
      _style += 'color:#900;border-bottom:3px solid #900;';
    } else {
      _style += 'color:#000;';
    }
  
    _style += 'background-color:' + this.backgroundColor;
  
    return _style;
  };
  
  public setBackgroundColor(bgColor: string): void {
    this.backgroundColor = '#' + bgColor;
  };
  
  public renderMap(): void {
    const map = Server.worldManager.getMap(this.location.map);

    this.socket.emit('mapRender', {
      name: map.getName(),
      title: map.getTitle(),
      rooms: map.getRooms(),
      objects: map.getObjects(),
      locationX: this.location.x,
      locationY: this.location.y
    });
  };

  public announceSelfToMap(): void {
    const nearbyPlayers = this.getMap().getPlayersWithinRadius(this.location.x, this.location.y, 100);

    nearbyPlayers.forEach(player => {
      if(player !== this) {
        const playerUpdateData: ISocketEvents.IPlayerUpdate = {
          id: this.getSocketId(),
          username: this.getUsername(),
          map: this.getLocation().map,
          x: this.getLocation().x,
          y: this.getLocation().y,
          style: this.getStyle()
        };

        player.emit('playerUpdate', playerUpdateData);
      }
    });
  }

  public renderNearbyPlayers(): void {
    const nearbyPlayers = this.getMap().getPlayersWithinRadius(this.location.x, this.location.y, 100);

    nearbyPlayers.forEach(player => {
      if(player !== this) {
        const playerUpdateData: ISocketEvents.IPlayerUpdate = {
          id: player.getSocketId(),
          username: player.getUsername(),
          map: player.getLocation().map,
          x: player.getLocation().x,
          y: player.getLocation().y,
          style: player.getStyle()
        };

        this.emit('playerUpdate', playerUpdateData);
      }
    });
  }
}

export default Player;
export { IPlayerSaveConfig };