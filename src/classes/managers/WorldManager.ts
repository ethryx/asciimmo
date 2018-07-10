import IManager from '../interfaces/IManager';
import WorldMap, { IWorldMapSaveConfig } from '../WorldMap';
import BaseManager from './BaseManager';

class WorldManager extends BaseManager implements IManager {
  private worldMaps: Map<string, WorldMap>;

  constructor() {
    super();
    this.worldMaps = new Map();
  }

  public async startup(): Promise<void> {
    if(await this.dataFileExists('maps') === false) {
      console.log('No map data found.');
      const wm = new WorldMap('World');
      this.worldMaps.set(wm.getName(), wm);
      console.log(`Created map: ${wm.getName()}`);
      return;
    }

    const loadedWorldMaps: Array<IWorldMapSaveConfig> = await this.readDataFile('maps');

    loadedWorldMaps.forEach(worldMap => {
      const wm = new WorldMap();
      wm.loadFromConfig(worldMap);
      this.worldMaps.set(worldMap.name, wm);
      console.log(`Map loaded: ${worldMap.name} (${worldMap.title})`)
    });
  }

  public getMap(mapName: string): WorldMap {
    return this.worldMaps.get(mapName);
  }
}

export default WorldManager;