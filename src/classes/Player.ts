import ILoginData from './interfaces/ILoginData'
import WorldMap from './WorldMap';
var fs = require('fs');

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
  private socketId: any;
  private socket: any;
  private game: any;
  private username: string;
  private backgroundColor: string;
  private canEdit: boolean;
  private location: ILocation;

  constructor(socket: any, game: any) {
    this.socketId = socket.id;
    this.socket = socket;
    this.game = game;
  }

  public load(loginData: ILoginData, loadedCallback: Function): Player {
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
        const dataObj: IPlayerSaveConfig = JSON.parse(data);
        this.location = dataObj.location;
        this.backgroundColor = dataObj.backgroundColor || '#999';
        this.canEdit = dataObj.canEdit || false;
      }
  
      loadedCallback(this);
    }.bind(this));
  
    return this;
  };
  
  public save(doneCallback: Function): void {
    const saveData: IPlayerSaveConfig = {
      username: this.username,
      location: this.location,
      backgroundColor: this.backgroundColor,
      canEdit: this.canEdit
    };
  
    fs.writeFile('./data/players/' + this.username, JSON.stringify(saveData), doneCallback);
  };
  
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
  
  public renderMap(map: WorldMap, shouldCreate): void {
    if(map === null && shouldCreate) {
      map = this.game.createNewMap(this.location.map);
    }
  
    this.socket.emit('mapRender', {
      name: map.getName(),
      title: map.getTitle(),
      rooms: map.getRooms(),
      objects: map.getObjects(),
      locationX: this.location.x,
      locationY: this.location.y
    });
  };
}

export default Player;