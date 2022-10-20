import { BigNumber, constants, providers } from "ethers";
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
import { computeBorrowIndex, computeSupplyIndex, getUserAccumulatedRewards } from "./utils/getUserRewards";

class BlockFetcher {
  private cache: { [blockNumber: number]: providers.Block | undefined } = {};
  constructor(private provider: providers.Provider) {}

  async getBlock(blockNumber: number) {
    if (!this.cache[blockNumber]) this.cache[blockNumber] = await this.provider.getBlock(blockNumber);
    return this.cache[blockNumber] as providers.Block;
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

export interface MarketConfig {
  address: string;
  supplyIndex: BigNumber;
  borrowIndex: BigNumber;
  supplyUpdateBlockTimestamp: BigNumber;
  borrowUpdateBlockTimestamp: BigNumber;
  lastP2PBorrowIndex: BigNumber;
  lastPoolBorrowIndex: BigNumber;
  lastP2PSupplyIndex: BigNumber;
  lastPoolSupplyIndex: BigNumber;
  lastTotalBorrow: BigNumber;
  lastTotalSupply: BigNumber;
}
export interface UserMarketConfig {
  userSupplyIndex: BigNumber;
  userBorrowIndex: BigNumber;
  userSupplyBalance: BigNumber;
  userBorrowBalance: BigNumber;
  accruedMorpho: BigNumber;
}

const MORPHO_COMPOUND_DEPLOYMENT_BLOCK = 14_860_866;
export class MorphoCompoundDistributor {
  public BATCH_SIZE = 100_000; // number of blocks per batch
  public lastBlockSynced = MORPHO_COMPOUND_DEPLOYMENT_BLOCK;
  static async init(provider: providers.Provider, morphoCompound: MorphoCompound) {
    const firstEpochBlock = allEpochs[0].initialBlock!;

    const distributor = new MorphoCompoundDistributor(provider, morphoCompound);
    // Initialize the balances at the beginning of the first epoch
    await distributor.batchEvents(MORPHO_COMPOUND_DEPLOYMENT_BLOCK, firstEpochBlock, false);
    return distributor;
  }

  private blockFetcher: BlockFetcher;

  private markets: { [marketAddress: string]: MarketConfig } = {};
  private users: {
    [address: string]: {
      [marketAddress: string]: UserMarketConfig;
    };
  } = {};
  constructor(private provider: providers.Provider, private morphoCompound: MorphoCompound) {
    this.blockFetcher = new BlockFetcher(provider);
  }
  async applyEpoch(epoch: EpochConfig) {
    if (!epoch.initialBlock) throw Error(`No initial block for epoch ${epoch.id}`);
    if (!epoch.finalBlock) throw Error(`No final block for epoch ${epoch.id}`);
    return this.batchEvents(epoch.initialBlock, epoch.finalBlock, true);
  }
  async batchEvents(blockFrom: number, blockTo: number, updateRewards = true) {
    if (blockTo > blockFrom + this.BATCH_SIZE) {
      let block = blockFrom;
      while (block < blockTo) {
        await this.batchEvents(block, Math.min(block + this.BATCH_SIZE, blockTo));
        block += this.BATCH_SIZE;
      }
      return;
    }
    console.log("Batch from", blockFrom, "to", blockTo);
    // process sequentially to prevent throughput issues
    const allEvents = await Promise.all([
      await this.morphoCompound.queryFilter(this.morphoCompound.filters.Repaid(), blockFrom, blockTo),
      this.morphoCompound.queryFilter(this.morphoCompound.filters.Borrowed(), blockFrom, blockTo),
      this.morphoCompound.queryFilter(this.morphoCompound.filters.Supplied(), blockFrom, blockTo),
      this.morphoCompound.queryFilter(this.morphoCompound.filters.Withdrawn(), blockFrom, blockTo),
      this.morphoCompound.queryFilter(this.morphoCompound.filters.P2PIndexesUpdated(), blockFrom, blockTo),
    ]);
    console.log(allEvents.flat().length, "events fetched");

    const allEventsSorted = allEvents.flat().sort((eventA, eventB) => {
      if (eventA.blockNumber !== eventB.blockNumber) return eventA.blockNumber > eventB.blockNumber ? 1 : -1;
      // events in the same block
      if (eventA.transactionIndex !== eventB.transactionIndex)
        return eventA.transactionIndex > eventB.transactionIndex ? 1 : -1;
      // events in the same tx, ordered by log index
      return eventA.logIndex > eventB.logIndex ? 1 : -1;
    });

    for (const event of allEventsSorted) {
      console.log("Process", event.eventSignature);
      switch (event.eventSignature) {
        case "Supplied(address,address,address,uint256,uint256,uint256)":
          await this.processSupply(event as SuppliedEvent, updateRewards);
          break;
        case "Borrowed(address,address,uint256,uint256,uint256)":
          await this.processBorrow(event as BorrowedEvent, updateRewards);
          break;
        case "Withdrawn(address,address,address,uint256,uint256,uint256)":
          await this.processWithdraw(event as WithdrawnEvent, updateRewards);
          break;
        case "Repaid(address,address,address,uint256,uint256,uint256)":
          await this.processRepay(event as RepaidEvent, updateRewards);
          break;
        case "P2PIndexesUpdated(address,uint256,uint256,uint256,uint256)":
          await this.processP2PIndexUpdate(event as P2PIndexesUpdatedEvent, updateRewards);
          break;
        default:
          throw Error("Unknown event");
      }
    }
    this.lastBlockSynced = blockTo;
  }
  private getOrInitUserBalance(address: string, market: string) {
    address = address.toLowerCase();
    market = market.toLowerCase();
    const marketConfig = this.markets[market];
    if (!this.users[address])
      this.users[address] = {
        [market]: {
          accruedMorpho: constants.Zero,
          userSupplyIndex: marketConfig.supplyIndex,
          userBorrowIndex: marketConfig.borrowIndex,
          userBorrowBalance: constants.Zero,
          userSupplyBalance: constants.Zero,
        },
      };
    if (!this.users[address][market]) {
      this.users[address][market] = {
        accruedMorpho: constants.Zero,
        userSupplyIndex: marketConfig.supplyIndex,
        userBorrowIndex: marketConfig.borrowIndex,
        userBorrowBalance: constants.Zero,
        userSupplyBalance: constants.Zero,
      };
    }
    return this.users[address][market];
  }
  private getOrInitMarket(address: string) {
    address = address.toLowerCase();
    if (!this.markets[address]) {
      this.markets[address] = {
        address,
        supplyIndex: constants.WeiPerEther,
        borrowIndex: constants.WeiPerEther,
        supplyUpdateBlockTimestamp: constants.Zero,
        borrowUpdateBlockTimestamp: constants.Zero,
        lastP2PBorrowIndex: constants.Zero,
        lastPoolBorrowIndex: constants.Zero,
        lastP2PSupplyIndex: constants.Zero,
        lastPoolSupplyIndex: constants.Zero,
        lastTotalBorrow: constants.Zero,
        lastTotalSupply: constants.Zero,
      };
    }
    return this.markets[address];
  }
  private async processSupply(event: SuppliedEvent, updateRewards = true) {
    const market = this.getOrInitMarket(event.args._poolTokenAddress);
    const supplyBalance = event.args._balanceInP2P
      .mul(market.lastP2PSupplyIndex)
      .add(event.args._balanceOnPool.mul(market.lastPoolSupplyIndex))
      .div(constants.WeiPerEther);
    await this.handleSupplySide(event.args._onBehalf, market, supplyBalance, updateRewards);
  }
  private async processWithdraw(event: WithdrawnEvent, updateRewards = true) {
    const market = this.getOrInitMarket(event.args._poolTokenAddress);
    const supplyBalance = event.args._balanceInP2P
      .mul(market.lastP2PSupplyIndex)
      .add(event.args._balanceOnPool.mul(market.lastPoolSupplyIndex))
      .div(constants.WeiPerEther);
    await this.handleSupplySide(event.args._supplier, market, supplyBalance, updateRewards);
  }

  private async handleSupplySide(
    userAddress: string,
    market: MarketConfig,
    newUserBalance: BigNumber,
    updateRewards = true
  ) {
    const userBalance = this.getOrInitUserBalance(userAddress, market.address);
    if (updateRewards) {
      userBalance.accruedMorpho = userBalance.accruedMorpho.add(
        getUserAccumulatedRewards(market.supplyIndex, userBalance.userSupplyIndex, userBalance.userSupplyBalance)
      );
      userBalance.userSupplyIndex = market.supplyIndex;
    }

    market.lastTotalSupply = market.lastTotalSupply.sub(userBalance.userSupplyBalance).add(newUserBalance);
    userBalance.userSupplyBalance = newUserBalance;
    this.users[userAddress.toLowerCase()][market.address.toLowerCase()] = userBalance;
  }
  private async processBorrow(event: BorrowedEvent, updateRewards = true) {
    const market = this.getOrInitMarket(event.args._poolTokenAddress);
    const borrowBalance = event.args._balanceInP2P
      .mul(market.lastP2PBorrowIndex)
      .add(event.args._balanceOnPool.mul(market.lastPoolBorrowIndex))
      .div(constants.WeiPerEther);
    await this.handleBorrowSide(event.args._borrower, market, borrowBalance, updateRewards);
  }
  private async processRepay(event: RepaidEvent, updateRewards = true) {
    const market = this.getOrInitMarket(event.args._poolTokenAddress);
    const borrowBalance = event.args._balanceInP2P
      .mul(market.lastP2PBorrowIndex)
      .add(event.args._balanceOnPool.mul(market.lastPoolBorrowIndex))
      .div(constants.WeiPerEther);
    await this.handleBorrowSide(event.args._onBehalf, market, borrowBalance, updateRewards);
  }

  private async handleBorrowSide(
    userAddress: string,
    market: MarketConfig,
    newUserBalance: BigNumber,
    updateRewards = true
  ) {
    const userBalance = this.getOrInitUserBalance(userAddress, market.address);
    if (updateRewards) {
      const accruedRewards = getUserAccumulatedRewards(
        market.borrowIndex,
        userBalance.userBorrowIndex,
        userBalance.userBorrowBalance
      );
      if (accruedRewards.gt(0)) {
        console.log(accruedRewards.toString(), "Rewards accrued for user", userAddress);
      }
      userBalance.accruedMorpho = userBalance.accruedMorpho.add(accruedRewards);
      userBalance.userBorrowIndex = market.borrowIndex;
    }
    market.lastTotalBorrow = market.lastTotalBorrow.sub(userBalance.userBorrowBalance).add(newUserBalance);
    userBalance.userBorrowBalance = newUserBalance;
    this.users[userAddress.toLowerCase()][market.address.toLowerCase()] = userBalance;
  }
  private async processP2PIndexUpdate(event: P2PIndexesUpdatedEvent, updateRewards = true) {
    // P2PIndexesUpdated is always emitted before a transaction event (Supplied, borrowed, Withdrawn, repaid)
    const market = this.getOrInitMarket(event.args._poolTokenAddress);
    // block caching is useless here since there is only one p2pIndexUpdate per block
    const block = await this.blockFetcher.getBlock(event.blockNumber);
    if (market.supplyUpdateBlockTimestamp.eq(0)) {
      market.supplyUpdateBlockTimestamp = BigNumber.from(block.timestamp);
      market.borrowUpdateBlockTimestamp = BigNumber.from(block.timestamp);
    }

    market.lastP2PBorrowIndex = event.args._p2pBorrowIndex;
    market.lastPoolBorrowIndex = event.args._poolBorrowIndex;
    market.lastP2PSupplyIndex = event.args._p2pSupplyIndex;
    market.lastPoolSupplyIndex = event.args._poolSupplyIndex;
    if (updateRewards) {
      market.supplyIndex = await computeSupplyIndex(market, BigNumber.from(block.timestamp), this.provider);
      market.borrowIndex = await computeBorrowIndex(market, BigNumber.from(block.timestamp), this.provider);
    }
  }

  get store() {
    return {
      currentBlock: this.lastBlockSynced,
      markets: Object.fromEntries(
        Object.entries(this.markets).map(([key, marketConfig]) => [
          key,
          {
            address: marketConfig.address.toString(),
            supplyIndex: marketConfig.supplyIndex.toString(),
            borrowIndex: marketConfig.borrowIndex.toString(),
            supplyUpdateBlockTimestamp: marketConfig.supplyUpdateBlockTimestamp.toString(),
            borrowUpdateBlockTimestamp: marketConfig.borrowUpdateBlockTimestamp.toString(),
            lastP2PBorrowIndex: marketConfig.lastP2PBorrowIndex.toString(),
            lastPoolBorrowIndex: marketConfig.lastPoolBorrowIndex.toString(),
            lastP2PSupplyIndex: marketConfig.lastP2PSupplyIndex.toString(),
            lastPoolSupplyIndex: marketConfig.lastPoolSupplyIndex.toString(),
            lastTotalBorrow: marketConfig.lastTotalBorrow.toString(),
            lastTotalSupply: marketConfig.lastTotalSupply.toString(),
          },
        ])
      ),
      users: Object.fromEntries(
        Object.entries(this.users).map(([key, user]) => [
          key,
          Object.fromEntries(
            Object.entries(user).map(([market, userConfig]) => [
              market,
              {
                userSupplyIndex: userConfig.userSupplyIndex.toString(),
                userBorrowIndex: userConfig.userBorrowIndex.toString(),
                userSupplyBalance: userConfig.userSupplyBalance.toString(),
                userBorrowBalance: userConfig.userBorrowBalance.toString(),
                accruedMorpho: userConfig.accruedMorpho.toString(),
              },
            ])
          ),
        ])
      ),
    };
  }
}
