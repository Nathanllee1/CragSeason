import { promises as fs } from 'fs';

export interface IndexEntry {
  o: number;
  l: number;
}

export class ContentRangeStore {
  private index: Record<string, IndexEntry> = {};

  constructor(
    private indexFilePath: string,
    private dataFilePath: string
  ) {}

  // Initialize by loading the index file if it exists; otherwise, create an empty index.
  async init(): Promise<void> {
    try {
      const data = await fs.readFile(this.indexFilePath, 'utf8');
      this.index = JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.index = {};
        await fs.writeFile(this.indexFilePath, JSON.stringify(this.index), 'utf8');
      } else {
        throw error;
      }
    }
  }

  // Append a new key/data pair. This method writes the data to the data file
  // and updates the index with the data's offset and length.
  async append(key: string, dataBuffer: Buffer): Promise<void> {
    if (this.index[key]) {
      // throw new Error(`Key "${key}" already exists.`);
      return
    }

    // Determine the current size (offset) of the data file.
    const dataStat = await fs.stat(this.dataFilePath).catch(async err => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.writeFile(this.dataFilePath, Buffer.alloc(0));
        return await fs.stat(this.dataFilePath);
      }
      throw err;
    });
    const offset = dataStat.size;

    // Append the new data
    await fs.appendFile(this.dataFilePath, dataBuffer);

    // Update the in-memory index and write it out. This is a simple, flat structure,
    // so we rewrite the entire JSON file each time.
    this.index[key] = { o: offset, l: dataBuffer.length };

    // await fs.writeFile(this.indexFilePath, JSON.stringify(this.index), 'utf8');
  }

  async writeIndex() {
    const index = JSON.stringify(this.index, null, 2);

    // Hash the data file
    const dataStat = await fs.stat(this.dataFilePath);
    const dataBuffer = await fs.readFile(this.dataFilePath);

    const dataHash = require('crypto').createHash('md5').update(dataBuffer).digest('hex');

    await fs.writeFile(this.indexFilePath, index, 'utf8');

    // write a file with the hash of the data file
    await fs.writeFile(this.dataFilePath + ".hash", dataHash, 'utf8');
  }
}
