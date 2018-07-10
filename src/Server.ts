import SocketManager from './classes/managers/SocketManager';
import WorldManager from './classes/managers/WorldManager';
import PlayerManager from './classes/managers/PlayerManager';
import SocketEventsManager from './classes/managers/SocketEventsManager';

class Server {
  public socketManager: SocketManager;
  public socketEventsManager: SocketEventsManager;
  public worldManager: WorldManager;
  public playerManager: PlayerManager;

  constructor() {
    this.showBanner();
    this.socketManager = new SocketManager();
    this.socketEventsManager = new SocketEventsManager();
    this.worldManager = new WorldManager();
    this.playerManager = new PlayerManager();
  }

  public async startup(): Promise<void> {
    await this.socketManager.startup();
    await this.socketEventsManager.startup();
    await this.worldManager.startup();
    await this.playerManager.startup();
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

ServerSingleton
  .startup()
  .then(() => ServerSingleton.allowConnections());

export default ServerSingleton as Server;