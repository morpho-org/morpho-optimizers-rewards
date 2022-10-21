import { providers } from "ethers";

/*
 * Fetch a block and save block data into a cache into the instance.
 */
export default class BlockFetcher {
  private cache: { [blockNumber: number]: providers.Block | undefined } = {};
  constructor(private provider: providers.Provider) {}

  async getBlock(blockNumber: number) {
    if (!this.cache[blockNumber]) this.cache[blockNumber] = await this.provider.getBlock(blockNumber);
    return this.cache[blockNumber] as providers.Block;
  }
}
