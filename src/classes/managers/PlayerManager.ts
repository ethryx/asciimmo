import IManager from '../interfaces/IManager';
import BaseManager from './BaseManager';
import Player, { IPlayerSaveConfig } from '../Player';

class PlayerManager extends BaseManager implements IManager {
  private connectedPlayers: Map<string, Player>;

  constructor() {
    super();
    this.connectedPlayers = new Map();
  }

  public async startup(): Promise<void> {
    return;
  }

  public getPlayers(): Array<Player> {
    return Array.from(this.connectedPlayers.values());
  }

  public getPlayerByUsername(username: string): Player {
    if(this.connectedPlayers.get(username.toLowerCase())) {
      return this.connectedPlayers.get(username.toLowerCase());
    } else {
      return null;
    }
  }

  public async addPlayer(username: string): Promise<Player> {
    let player: Player = new Player(username);

    if(await this.dataFileExists(`players/${username.toLowerCase()}`) === false) {
      console.log(`Created new player: ${username}`);
    } else {
      const savedPlayerJson: IPlayerSaveConfig = await this.readDataFile(`players/${username.toLowerCase()}`);
      player.loadFromConfig(savedPlayerJson);
      console.log(`Loaded existing player: ${username}`);
    }

    this.connectedPlayers.set(username.toLowerCase(), player);

    return player;
  }
}

export default PlayerManager;