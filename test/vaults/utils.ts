import { TransactionEvents } from "../../src/vaults/types";
import Distributor from "../../src/vaults/Distributor";
import { EventsFetcherInterface } from "../../src/vaults/VaultEventsFetcher";
import { BigNumber, providers } from "ethers";
import ProofsFetcher from "../../src/vaults/ProofsFetcher";
import { maxBN } from "@morpho-labs/ethers-utils/lib/utils";
import { FileSystemStorageService } from "../../src/utils/StorageService";
import { ParsedAgeEpochConfig } from "../../src";

const storageService = new FileSystemStorageService();

export const distributorFromEvents = (vaultAddress: string, events: TransactionEvents[]): Distributor => {
  class LocalEventFetcher implements EventsFetcherInterface {
    private _events = events;
    async fetchSortedEventsForEpoch(epochConfig: ParsedAgeEpochConfig): Promise<[TransactionEvents[], BigNumber]> {
      const epochEvents = this._events.filter(
        (ev) =>
          BigNumber.from(ev.event.blockNumber).gte(epochConfig.initialBlock!) &&
          BigNumber.from(ev.event.blockNumber).lte(epochConfig.finalBlock!)
      );
      if (epochEvents.length === 0) return [[], BigNumber.from(epochConfig.initialTimestamp)];

      const blockFrom = maxBN(epochEvents[0].event.blockNumber, epochConfig.initialBlock!);
      const timeFrom = await this.getBlock(+blockFrom.toString()).then((block) => BigNumber.from(block.timestamp));
      return [epochEvents, timeFrom];
    }
    async getBlock(blockNumber: number): Promise<providers.Block> {
      const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
      return provider.getBlock(blockNumber);
    }
  }
  const eventsFetcher = new LocalEventFetcher();
  const proofsFetcher = new ProofsFetcher(storageService);

  return new Distributor(vaultAddress, eventsFetcher, proofsFetcher);
};
