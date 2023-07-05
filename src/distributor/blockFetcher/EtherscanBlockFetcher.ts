import { IBlockFetcher } from "../MarketDistributor";
import { blockFromTimestamp } from "../../utils";

export class EtherscanBlockFetcher implements IBlockFetcher {
  #apiKey: string;
  constructor(_apiKey: string) {
    this.#apiKey = _apiKey;
  }

  async blockFromTimestamp(ts: number, direction: "before" | "after") {
    console.log(ts, direction);
    const res = await blockFromTimestamp(ts, direction, this.#apiKey);
    const blockNumber = parseInt(res);
    if (isNaN(blockNumber)) throw Error("Invalid timestamp fetched from etherscan");
    console.log(`Block for timestamp ${ts}: ${blockNumber} (direction: ${direction})`);
    return blockNumber;
  }
}
