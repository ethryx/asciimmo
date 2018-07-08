import SocketManager from './classes/managers/SocketManager';
import WorldManager from './classes/managers/WorldManager';

class Server {
  private socketManager: SocketManager;
  private worldManager: WorldManager;

  constructor() {
    this.showBanner();
    this.socketManager = new SocketManager();
    this.worldManager = new WorldManager();
  }

  public startup(): void {
    this.socketManager.startup();
    this.worldManager.startup();
  }

  public allowConnections(): void {
    this.socketManager.allowConnections();
  }

  private showBanner(): void {
    console.log('A R C A D I A');
    console.log('-------------');
  }
}

const ServerSingleton = new Server();
ServerSingleton.startup();
ServerSingleton.allowConnections();
export default ServerSingleton as Server;