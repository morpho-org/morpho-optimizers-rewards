import { BigNumber, constants, providers } from "ethers";
import {
  BorrowedEvent,
  MorphoCompound,
  P2PIndexesUpdatedEvent,
  RepaidEvent,
  SuppliedEvent,
  WithdrawnEvent,
} from "@morpho-labs/morpho-ethers-contract/lib/compound/MorphoCompound";
import { allEpochs, EpochConfig } from "../ages";
import {
  computeBorrowIndex,
  computeSupplyIndex,
  getUserAccumulatedRewards,
  userBalancesToUnclaimedTokens,
} from "../utils/getUserRewards";
import { computeMerkleTree } from "../utils";
import BlockFetcher from "../BlockFetcher";
import RewardsDistributorStorage from "./RewardsDistributorStorage";

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

export const MORPHO_COMPOUND_DEPLOYMENT_BLOCK = 14_860_866;

export default class MorphoCompoundRewardsDistributor extends RewardsDistributorStorage {
  /**
   * For testing purpose, you can use
   * an initial storage
   */
  static initFromDump(
    provider: providers.Provider,
    morphoCompound: MorphoCompound,
    dump: {
      markets: object;
      users: { [userAddress: string]: object };
      currentBlock: number;
    }
  ) {
    const distributor = new MorphoCompoundRewardsDistributor(provider, morphoCompound);
    distributor.lastBlockSynced = dump.currentBlock;
    distributor.markets = Object.fromEntries(
      Object.entries(dump.markets).map(([key, marketConfig]) => [
        key,
        {
          address: marketConfig.address.toString(),
          supplyIndex: BigNumber.from(marketConfig.supplyIndex),
          borrowIndex: BigNumber.from(marketConfig.borrowIndex),
          supplyUpdateBlockTimestamp: BigNumber.from(marketConfig.supplyUpdateBlockTimestamp),
          borrowUpdateBlockTimestamp: BigNumber.from(marketConfig.borrowUpdateBlockTimestamp),
          lastP2PBorrowIndex: BigNumber.from(marketConfig.lastP2PBorrowIndex),
          lastPoolBorrowIndex: BigNumber.from(marketConfig.lastPoolBorrowIndex),
          lastP2PSupplyIndex: BigNumber.from(marketConfig.lastP2PSupplyIndex),
          lastPoolSupplyIndex: BigNumber.from(marketConfig.lastPoolSupplyIndex),
          lastTotalBorrow: BigNumber.from(marketConfig.lastTotalBorrow),
          lastTotalSupply: BigNumber.from(marketConfig.lastTotalSupply),
        },
      ])
    );
    distributor.users = Object.fromEntries(
      Object.entries(dump.users).map(([key, user]) => [
        key,
        Object.fromEntries(
          Object.entries(user).map(([market, userConfig]) => [
            market,
            {
              userSupplyIndex: BigNumber.from(userConfig.userSupplyIndex),
              userBorrowIndex: BigNumber.from(userConfig.userBorrowIndex),
              userSupplyBalance: BigNumber.from(userConfig.userSupplyBalance),
              userBorrowBalance: BigNumber.from(userConfig.userBorrowBalance),
              accruedMorpho: BigNumber.from(userConfig.accruedMorpho),
            },
          ])
        ),
      ])
    );
    return distributor;
  }

  /**
   * Init function fetch the events before the first epoch in order
   * to retrieve initial user states
   */
  static async init(provider: providers.Provider, morphoCompound: MorphoCompound) {
    const firstEpochBlock = allEpochs[0].initialBlock!;

    const distributor = new MorphoCompoundRewardsDistributor(provider, morphoCompound);
    // Initialize the balances at the beginning of the first epoch
    await distributor.batchEvents(MORPHO_COMPOUND_DEPLOYMENT_BLOCK, firstEpochBlock, false);
    return distributor;
  }

  // ----------------- storage ------------------------
  public BATCH_SIZE = 100_000; // number of blocks per batch
  private blockFetcher: BlockFetcher;

  constructor(private provider: providers.Provider, private morphoCompound: MorphoCompound) {
    super(MORPHO_COMPOUND_DEPLOYMENT_BLOCK);
    this.blockFetcher = new BlockFetcher(provider);
  }

  async applyEpoch(epoch: EpochConfig) {
    if (!epoch.initialBlock) throw Error(`No initial block for epoch ${epoch.id}`);
    if (!epoch.finalBlock) throw Error(`No final block for epoch ${epoch.id}`);
    if (this.lastBlockSynced >= epoch.finalBlock) {
      // epoch already applied
      return;
    }
    this.currentEpoch = epoch;
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
    // process sequentially to prevent throughput issues
    const allEvents = await Promise.all([
      await this.morphoCompound.queryFilter(this.morphoCompound.filters.Repaid(), blockFrom, blockTo),
      this.morphoCompound.queryFilter(this.morphoCompound.filters.Borrowed(), blockFrom, blockTo),
      this.morphoCompound.queryFilter(this.morphoCompound.filters.Supplied(), blockFrom, blockTo),
      this.morphoCompound.queryFilter(this.morphoCompound.filters.Withdrawn(), blockFrom, blockTo),
      this.morphoCompound.queryFilter(this.morphoCompound.filters.P2PIndexesUpdated(), blockFrom, blockTo),
    ]);

    const allEventsSorted = allEvents.flat().sort((eventA, eventB) => {
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
          await this.processP2PIndexUpdate(event as P2PIndexesUpdatedEvent);
          break;
        default:
          throw Error("Unknown event");
      }
    }
    this.lastBlockSynced = blockTo;
  }

  // ---------------- Event processing -----------------

  private async processSupply(event: SuppliedEvent, updateRewards = true) {
    const market = this.getOrInitMarket(event.args._poolTokenAddress);
    const supplyBalance = event.args._balanceInP2P
      .mul(market.lastP2PSupplyIndex)
      .add(event.args._balanceOnPool.mul(market.lastPoolSupplyIndex))
      .div(constants.WeiPerEther);
    const block = await this.blockFetcher.getBlock(event.blockNumber);
    await this.handleSupplySide(event.args._onBehalf, market, supplyBalance, block, updateRewards);
  }

  private async processWithdraw(event: WithdrawnEvent, updateRewards = true) {
    const market = this.getOrInitMarket(event.args._poolTokenAddress);
    const supplyBalance = event.args._balanceInP2P
      .mul(market.lastP2PSupplyIndex)
      .add(event.args._balanceOnPool.mul(market.lastPoolSupplyIndex))
      .div(constants.WeiPerEther);
    const block = await this.blockFetcher.getBlock(event.blockNumber);
    await this.handleSupplySide(event.args._supplier, market, supplyBalance, block, updateRewards);
  }

  private async handleSupplySide(
    userAddress: string,
    market: MarketConfig,
    newUserBalance: BigNumber,
    block: providers.Block,
    updateRewards = true
  ) {
    const userBalance = this.getOrInitUserBalance(userAddress, market.address);
    if (updateRewards) {
      market.supplyIndex = await computeSupplyIndex(market, BigNumber.from(block.timestamp), this.provider);
      userBalance.accruedMorpho = userBalance.accruedMorpho.add(
        getUserAccumulatedRewards(market.supplyIndex, userBalance.userSupplyIndex, userBalance.userSupplyBalance)
      );
      userBalance.userSupplyIndex = market.supplyIndex;
    }

    market.lastTotalSupply = market.lastTotalSupply.sub(userBalance.userSupplyBalance).add(newUserBalance);
    market.supplyUpdateBlockTimestamp = BigNumber.from(block.timestamp);
    userBalance.userSupplyBalance = newUserBalance;
  }

  private async processBorrow(event: BorrowedEvent, updateRewards = true) {
    const market = this.getOrInitMarket(event.args._poolTokenAddress);
    const borrowBalance = event.args._balanceInP2P
      .mul(market.lastP2PBorrowIndex)
      .add(event.args._balanceOnPool.mul(market.lastPoolBorrowIndex))
      .div(constants.WeiPerEther);
    const block = await this.blockFetcher.getBlock(event.blockNumber);
    await this.handleBorrowSide(event.args._borrower, market, borrowBalance, block, updateRewards);
  }

  private async processRepay(event: RepaidEvent, updateRewards = true) {
    const market = this.getOrInitMarket(event.args._poolTokenAddress);
    const borrowBalance = event.args._balanceInP2P
      .mul(market.lastP2PBorrowIndex)
      .add(event.args._balanceOnPool.mul(market.lastPoolBorrowIndex))
      .div(constants.WeiPerEther);
    const block = await this.blockFetcher.getBlock(event.blockNumber);
    await this.handleBorrowSide(event.args._onBehalf, market, borrowBalance, block, updateRewards);
  }

  private async handleBorrowSide(
    userAddress: string,
    market: MarketConfig,
    newUserBalance: BigNumber,
    block: providers.Block,
    updateRewards = true
  ) {
    const userBalance = this.getOrInitUserBalance(userAddress, market.address);
    if (updateRewards) {
      market.borrowIndex = await computeBorrowIndex(market, BigNumber.from(block.timestamp), this.provider);
      const accruedRewards = getUserAccumulatedRewards(
        market.borrowIndex,
        userBalance.userBorrowIndex,
        userBalance.userBorrowBalance
      );
      userBalance.accruedMorpho = userBalance.accruedMorpho.add(accruedRewards);
      userBalance.userBorrowIndex = market.borrowIndex;
    }
    market.lastTotalBorrow = market.lastTotalBorrow.sub(userBalance.userBorrowBalance).add(newUserBalance);
    userBalance.userBorrowBalance = newUserBalance;
    market.borrowUpdateBlockTimestamp = BigNumber.from(block.timestamp);
  }

  private async processP2PIndexUpdate(event: P2PIndexesUpdatedEvent) {
    // P2PIndexesUpdated is always emitted before a transaction event (Supplied, borrowed, Withdrawn, repaid)
    const market = this.getOrInitMarket(event.args._poolTokenAddress);

    market.lastP2PBorrowIndex = event.args._p2pBorrowIndex;
    market.lastPoolBorrowIndex = event.args._poolBorrowIndex;
    market.lastP2PSupplyIndex = event.args._p2pSupplyIndex;
    market.lastPoolSupplyIndex = event.args._poolSupplyIndex;
  }

  // ----------- After processing getters -----------

  public async getUsersAccumulatedRewards() {
    const finalTimestamp = this.currentEpoch?.finalTimestamp;
    if (!finalTimestamp) {
      throw Error("No final timestamp");
    }
    return Promise.all(
      this.usersBalances.map(async ({ address, balances }) => ({
        address,
        accumulatedRewards: (await userBalancesToUnclaimedTokens(balances, finalTimestamp, this.provider)).toString(), // with 18 decimals
      }))
    );
  }

  public async totalEmitted() {
    return this.getUsersAccumulatedRewards().then((r) =>
      r.reduce((a, b) => a.add(b.accumulatedRewards), BigNumber.from(0))
    );
  }

  public async computeMerkleTree() {
    const userRewards = (await this.getUsersAccumulatedRewards()).filter((b) => b.accumulatedRewards !== "0");
    // remove users with 0 MORPHO to claim
    return computeMerkleTree(userRewards);
  }
}
