import * as fs from 'fs';
import * as util from 'util';

const baseDataDir = `${__dirname}/../../../data`;
const readFile = util.promisify(fs.readFile);
const exists = util.promisify(fs.exists);

class BaseManager {
  protected async dataFileExists(fileName: string): Promise<boolean> {
    return await exists(`${baseDataDir}/${fileName}`);
  }

  protected async readDataFile(fileName: string): Promise<any> {
    const fileContents: Buffer = await readFile(`${baseDataDir}/${fileName}`);
    return JSON.parse(fileContents.toString('utf8'));
  }
}

export default BaseManager;