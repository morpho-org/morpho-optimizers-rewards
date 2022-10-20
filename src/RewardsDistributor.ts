import { BigNumberish, constants, providers } from "ethers";
import {
  BorrowedEvent,
  MorphoCompound,
  P2PIndexesUpdatedEvent,
  RepaidEvent,
  SuppliedEvent,
  WithdrawnEvent,
} from "@morpho-labs/morpho-ethers-contract/lib/compound/MorphoCompound";
import { MorphoAaveV2 } from "@morpho-labs/morpho-ethers-contract/lib/aave-v2/mainnet/MorphoAaveV2";
import { allEpochs, EpochConfig } from "./ages";
import { now } from "./helpers";

class BlockFetcher {
  private cache: { [blockNumber: number]: providers.Block | undefined } = {};
  constructor(private provider: providers.Provider) {}

  async getBlock(blockNumber: number) {
    if (!this.cache[blockNumber]) this.cache[blockNumber] = await this.provider.getBlock(blockNumber);
    return this.cache[blockNumber];
  }
}

export default class MorphoRewardsDistributor {
  private lastSyncBlock: number = 0;
  private blockFetcher: BlockFetcher;
  constructor(
    private provider: providers.Provider,
    private morphoCompound: MorphoCompound,
    private morphoAave: MorphoAaveV2
  ) {
    this.blockFetcher = new BlockFetcher(provider);
  }

  async runEpoch(epochId: string) {
    const epoch = allEpochs.find((e) => e.id === epochId);
    if (!epoch) throw Error(`Unknown epoch ${epochId}`);
    if (epoch.finalTimestamp.gt(now())) throw Error(`Epoch ${epochId} is not finished`);
  }
  private async applyEpoch(epoch: EpochConfig) {}
}
class MorphoCompoundDistributor {
  private blockFetcher: BlockFetcher;
  constructor(private provider: providers.Provider, private morphoCompound: MorphoCompound) {
    this.blockFetcher = new BlockFetcher(provider);
  }

  private async applyEpoch(epoch: EpochConfig) {
    if (!epoch.initialBlock) throw Error(`No initial block for epoch ${epoch.id}`);
    if (!epoch.finalBlock) throw Error(`No final block for epoch ${epoch.id}`);

    // process sequencially to prevent throughput issues
    const repayEvents = await this.morphoCompound.queryFilter(
      this.morphoCompound.filters.Repaid(),
      epoch.initialBlock,
      epoch.finalBlock
    );
    const borrowedEvents = await this.morphoCompound.queryFilter(
      this.morphoCompound.filters.Borrowed(),
      epoch.initialBlock,
      epoch.finalBlock
    );
    const suppliedEvents = await this.morphoCompound.queryFilter(
      this.morphoCompound.filters.Supplied(),
      epoch.initialBlock,
      epoch.finalBlock
    );
    const withdrawnEvents = await this.morphoCompound.queryFilter(
      this.morphoCompound.filters.Withdrawn(),
      epoch.initialBlock,
      epoch.finalBlock
    );
    const p2pIndexesUpdateEvent = await this.morphoCompound.queryFilter(
      this.morphoCompound.filters.P2PIndexesUpdated(),
      epoch.initialBlock,
      epoch.finalBlock
    );
    const allEventsSorted = [repayEvents, borrowedEvents, suppliedEvents, withdrawnEvents, p2pIndexesUpdateEvent]
      .flat()
      .sort((eventA, eventB) => {
        if (eventA.blockNumber !== eventB.blockNumber) return eventA.blockNumber > eventB.blockNumber ? 1 : -1;
        // events in the same block
        if (eventA.transactionIndex !== eventB.transactionIndex)
          return eventA.transactionIndex > eventB.transactionIndex ? 1 : -1;
        // events in the same tx, ordered by log index
        return eventA.logIndex > eventB.logIndex ? 1 : -1;
      });
    for (const event of allEventsSorted) {
      switch (event.eventSignature) {
        case "Supplied(address,address,address,uint256,uint256,uint256)":
          this.processSupply(event as SuppliedEvent);
          break;
        case "Borrowed(address,address,uint256,uint256,uint256)":
          this.processBorrow(event as BorrowedEvent);
          break;
        case "Withdrawn(address,address,address,uint256,uint256,uint256)":
          this.processWithdraw(event as WithdrawnEvent);
          break;
        case "Repaid(address,address,address,uint256,uint256,uint256)":
          this.processRepay(event as RepaidEvent);
          break;
        case "P2PIndexesUpdated(address,uint256,uint256,uint256,uint256)":
          this.processP2PIndexUpdate(event as P2PIndexesUpdatedEvent);
          break;
        default:
          throw Error("Unknown event");
      }
    }
  }
  private processSupply(event: SuppliedEvent) {}
  private processBorrow(event: BorrowedEvent) {}
  private processWithdraw(event: WithdrawnEvent) {}
  private processRepay(event: RepaidEvent) {}
  private processP2PIndexUpdate(event: P2PIndexesUpdatedEvent) {}
}
