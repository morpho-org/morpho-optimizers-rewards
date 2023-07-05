import { IBlockFetcher } from "../MarketDistributor";
import { blockFromTimestamp } from "../../utils";

export class EtherscanBlockFetcher implements IBlockFetcher {
  #apiKey: string;
  constructor(_apiKey: string) {
    this.#apiKey = _apiKey;
  }

  async blockFromTimestamp(ts: number, direction: "before" | "after", retries = 0): Promise<number> {
    const res = await blockFromTimestamp(ts, direction, this.#apiKey);
    const blockNumber = parseInt(res);
    if (isNaN(blockNumber)) {
      console.warn(`Invalid timestamp fetched from etherscan: ${res}, retry number ${retries}`);
      if (retries > 10) throw Error("Too many retries, aborting...");
      await wait(2000);
      return this.blockFromTimestamp(ts, direction, retries + 1);
    }
    return blockNumber;
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
