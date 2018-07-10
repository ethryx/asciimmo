import * as fs from 'fs';
import * as util from 'util';

const baseDataDir = `${__dirname}/../../../data`;
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const exists = util.promisify(fs.exists);

class BaseManager {
  protected async dataFileExists(fileName: string): Promise<boolean> {
    return await exists(`${baseDataDir}/${fileName}`);
  }

  protected async readDataFile(fileName: string): Promise<any> {
    const fileContents: Buffer = await readFile(`${baseDataDir}/${fileName}`);
    return JSON.parse(fileContents.toString('utf8'));
  }

  protected async writeDataFile(fileName: string, contents: any): Promise<void> {
    await writeFile(`${baseDataDir}/${fileName}`, JSON.stringify(contents));
    return;
  }
}

export default BaseManager;