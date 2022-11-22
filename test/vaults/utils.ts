import { TransactionEvents } from "../../src/vaults/types";
import Distributor from "../../src/vaults/Distributor";
import { EventsFetcherInterface } from "../../src/vaults/VaultEventsFetcher";
import { EpochConfig } from "../../src";
import { BigNumber, providers } from "ethers";
import ProofsFetcher from "../../src/vaults/ProofsFetcher";

export const distributorFromEvents = (vaultAddress: string, events: TransactionEvents[]): Distributor => {
  class EventFetcherOneDepositor implements EventsFetcherInterface {
    /* eslint-disable-next-line */
    async fetchSortedEventsForEpoch(epochConfig: EpochConfig): Promise<[TransactionEvents[], BigNumber]> {
      const blockFrom = events[0].event.blockNumber;
      const timeFrom = await this.getBlock(blockFrom).then((block) => BigNumber.from(block.timestamp));
      return [events, timeFrom];
    }
    async getBlock(blockNumber: number): Promise<providers.Block> {
      const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
      return provider.getBlock(blockNumber);
    }
  }
  const eventsFetcher = new EventFetcherOneDepositor();
  const proofsFetcher = new ProofsFetcher();

  return new Distributor(vaultAddress, eventsFetcher, proofsFetcher);
};
