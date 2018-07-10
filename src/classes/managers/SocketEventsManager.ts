import IManager from '../interfaces/IManager';
import BaseManager from './BaseManager';
import * as socketIo from 'socket.io';
import Server from '../../Server';
import * as ISocketEvents from '../interfaces/ISocketEvents';

interface ILoginData {
  username: string
}

class SocketEventsManager extends BaseManager implements IManager {
  private loggedInEvents: Map<string, any>;

  constructor() {
    super();
    this.loggedInEvents = new Map();
    this.loggedInEvents.set('location', this.onLocation);
  }

  public async startup(): Promise<void> {
    return;
  }

  public async shutdown(): Promise<void> {
    return;
  }
  
  public async onLogin(socket: socketIo.Socket, loginData: ILoginData): Promise<void> {
    if(Server.playerManager.getPlayerByUsername(loginData.username)) {
      socket.emit('text', 'That user is already logged in.');
      return;
    }

    const addedPlayer = await Server.playerManager.addPlayer(loginData.username);
    addedPlayer.attachSocket(socket);

    // Bind post-login events to socket
    const bindableEventNames: Array<string> = Array.from(this.loggedInEvents.keys());
    bindableEventNames.forEach(eventName => {
      socket.on(eventName, (...args) => {
        this.loggedInEvents.get(eventName)(socket, ...args);
      });
    });

    const loggedInData: ISocketEvents.ILoggedIn = {
      id: socket.id,
      username: addedPlayer.getUsername(),
      style: addedPlayer.getStyle(),
      canEdit: addedPlayer.getCanEdit()
    };

    socket.emit('loggedIn', loggedInData);

    addedPlayer.renderMap();
    addedPlayer.renderNearbyPlayers();
    addedPlayer.announceSelfToMap();
  }

  private async onLocation(socket: socketIo.Socket, locationData): Promise<void> {

  }
}

export default SocketEventsManager;