import { BlockTimestamp, IEventFetcher, IndexesEvent, TxEvent } from "../Distributor";
import { BigNumber, providers } from "ethers";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import {
  MorphoAaveV2__factory,
  MorphoAaveV3__factory,
  MorphoCompound__factory,
} from "@morpho-labs/morpho-ethers-contract";
import { WadRayMath } from "@morpho-labs/ethers-utils/lib/maths";
import * as fs from "fs";

const configuration = [
  {
    address: addresses.morphoAaveV2.morpho,
    factory: MorphoAaveV2__factory,
    deploymentBlock: 15383036,
    balanceOnPool: "_balanceOnPool",
    balanceInP2P: "_balanceInP2P",
    market: "_poolToken",
    poolSupplyIndex: "_poolSupplyIndex",
    p2pSupplyIndex: "_p2pSupplyIndex",
    poolBorrowIndex: "_poolBorrowIndex",
    p2pBorrowIndex: "_p2pBorrowIndex",
    P2PIndexesUpdated: "P2PIndexesUpdated",
    supplyUser: "_onBehalf",
    borrowUser: "_borrower",
    withdrawUser: "_supplier",
    repayUser: "_onBehalf",
  },
  {
    address: addresses.morphoAaveV3.morpho,
    factory: MorphoAaveV3__factory,
    deploymentBlock: 17161283,
    balanceOnPool: "scaledOnPool",
    balanceInP2P: "scaledInP2P",
    market: "underlying",
    poolSupplyIndex: "poolSupplyIndex",
    p2pSupplyIndex: "p2pSupplyIndex",
    poolBorrowIndex: "poolBorrowIndex",
    p2pBorrowIndex: "p2pBorrowIndex",
    P2PIndexesUpdated: "IndexesUpdated",
    supplyUser: "onBehalf",
    borrowUser: "onBehalf",
    withdrawUser: "onBehalf",
    repayUser: "onBehalf",
  },
  {
    address: addresses.morphoCompound.morpho,
    factory: MorphoCompound__factory,
    deploymentBlock: 14860866,
    balanceOnPool: "_balanceOnPool",
    balanceInP2P: "_balanceInP2P",
    market: "_poolToken",
    poolSupplyIndex: "_poolSupplyIndex",
    p2pSupplyIndex: "_p2pSupplyIndex",
    poolBorrowIndex: "_poolBorrowIndex",
    p2pBorrowIndex: "_p2pBorrowIndex",
    P2PIndexesUpdated: "P2PIndexesUpdated",
    supplyUser: "_onBehalf",
    borrowUser: "_borrower",
    withdrawUser: "_supplier",
    repayUser: "_onBehalf",
  },
] as const;

class BlockFetcher {
  #provider: providers.Provider;

  #blocksCache: Map<number, providers.Block>;
  constructor(_provider: providers.Provider) {
    this.#provider = _provider;
    this.#blocksCache = new Map();
  }
  async getBlock(blockNumber: number) {
    if (this.#blocksCache.has(blockNumber)) return this.#blocksCache.get(blockNumber)!;
    const block = await this.#provider.getBlock(blockNumber);
    this.#blocksCache.set(blockNumber, block);
    return block!;
  }
}
export class ChainEventFetcher implements IEventFetcher {
  #blockFetcher: BlockFetcher;
  #provider: providers.Provider;
  constructor(_provider: providers.Provider) {
    this.#provider = _provider;
    this.#blockFetcher = new BlockFetcher(_provider);
  }

  async getEvents(from: BlockTimestamp, to: BlockTimestamp) {
    const allEvents = await Promise.all(configuration.map((c) => this.#getConfiguratedEvents(from, to, c)));
    await fs.promises.writeFile("events.json", JSON.stringify(allEvents.flat(), null, 2));
    return [...new Set(allEvents.flat())].sort((event1, event2) => {
      if (event1.block.block !== event2.block.block) return event1.block.block - event2.block.block;
      if (event1.transactionIndex !== event2.transactionIndex) return event1.transactionIndex - event2.transactionIndex;
      if (event1.logIndex !== event2.logIndex) return event1.logIndex - event2.logIndex;
      return 0; // Can happen with the index update splitted in 2 events
    });
  }
  async #getConfiguratedEvents(
    from: BlockTimestamp,
    to: BlockTimestamp,
    config: (typeof configuration)[1] | (typeof configuration)[2] | (typeof configuration)[0]
  ): Promise<(IndexesEvent | TxEvent)[]> {
    let blockFrom = from.block;
    if (to.block < config.deploymentBlock) return [];
    if (from.block < config.deploymentBlock) blockFrom = config.deploymentBlock;

    const morpho = config.factory.connect(config.address, this.#provider);

    const supplyEvents = await morpho.queryFilter(morpho.filters.Supplied(), blockFrom, to.block).then((e) =>
      Promise.all(
        e.map(async (e) => ({
          block: {
            block: e.blockNumber,
            timestamp: await this.#blockFetcher.getBlock(e.blockNumber).then((b) => b.timestamp),
          },
          transactionIndex: e.transactionIndex,
          logIndex: e.logIndex,
          user: (e.args[config.supplyUser as keyof typeof e.args] as string).toLowerCase(),
          onPool: e.args[config.balanceOnPool as keyof typeof e.args] as BigNumber,
          inP2P: e.args[config.balanceInP2P as keyof typeof e.args] as BigNumber,
          marketSide: (e.args[config.market as keyof typeof e.args] as string).toLowerCase() + "-Supply",
        }))
      )
    );
    const borrowEvents = await morpho.queryFilter(morpho.filters.Borrowed(), blockFrom, to.block).then((e) =>
      Promise.all(
        e.map(async (e) => ({
          block: {
            block: e.blockNumber,
            timestamp: await this.#blockFetcher.getBlock(e.blockNumber).then((b) => b.timestamp),
          },
          transactionIndex: e.transactionIndex,
          logIndex: e.logIndex,
          user: (e.args[config.borrowUser as keyof typeof e.args] as string).toLowerCase(),
          onPool: e.args[config.balanceOnPool as keyof typeof e.args] as BigNumber,
          inP2P: e.args[config.balanceInP2P as keyof typeof e.args] as BigNumber,
          marketSide: (e.args[config.market as keyof typeof e.args] as string).toLowerCase() + "-Borrow",
        }))
      )
    );
    const withdrawEvents = await morpho.queryFilter(morpho.filters.Withdrawn(), blockFrom, to.block).then((e) =>
      Promise.all(
        e.map(async (e) => ({
          block: {
            block: e.blockNumber,
            timestamp: await this.#blockFetcher.getBlock(e.blockNumber).then((b) => b.timestamp),
          },
          transactionIndex: e.transactionIndex,
          logIndex: e.logIndex,
          user: (e.args[config.withdrawUser as keyof typeof e.args] as string).toLowerCase(),
          onPool: e.args[config.balanceOnPool as keyof typeof e.args] as BigNumber,
          inP2P: e.args[config.balanceInP2P as keyof typeof e.args] as BigNumber,
          marketSide: (e.args[config.market as keyof typeof e.args] as string).toLowerCase() + "-Supply",
        }))
      )
    );
    const repayEvents = await morpho.queryFilter(morpho.filters.Repaid(), blockFrom, to.block).then((e) =>
      Promise.all(
        e.map(async (e) => ({
          block: {
            block: e.blockNumber,
            timestamp: await this.#blockFetcher.getBlock(e.blockNumber).then((b) => b.timestamp),
          },
          transactionIndex: e.transactionIndex,
          logIndex: e.logIndex,
          user: (e.args[config.repayUser as keyof typeof e.args] as string).toLowerCase(),
          onPool: e.args[config.balanceOnPool as keyof typeof e.args] as BigNumber,
          inP2P: e.args[config.balanceInP2P as keyof typeof e.args] as BigNumber,
          marketSide: (e.args[config.market as keyof typeof e.args] as string).toLowerCase() + "-Borrow",
        }))
      )
    );
    const indexesUpdatedEvents = await morpho
      .queryFilter(morpho.filters[config.P2PIndexesUpdated as keyof typeof morpho.filters](), blockFrom, to.block)
      .then((e) =>
        Promise.all(
          e.map(async (e) => [
            {
              block: {
                block: e.blockNumber,
                timestamp: await this.#blockFetcher.getBlock(e.blockNumber).then((b) => b.timestamp),
              },
              transactionIndex: e.transactionIndex,
              logIndex: e.logIndex,
              marketSide: (e.args[config.market as keyof typeof e.args] as string).toLowerCase() + "-Borrow",
              indexPrecision: WadRayMath.WAD,
              indexOnPool: e.args[config.poolBorrowIndex as keyof typeof e.args] as BigNumber,
              indexInP2P: e.args[config.p2pBorrowIndex as keyof typeof e.args] as BigNumber,
            },
            {
              block: {
                block: e.blockNumber,
                timestamp: await this.#blockFetcher.getBlock(e.blockNumber).then((b) => b.timestamp),
              },
              transactionIndex: e.transactionIndex,
              logIndex: e.logIndex,
              marketSide: (e.args[config.market as keyof typeof e.args] as string).toLowerCase() + "-Supply",
              indexPrecision: WadRayMath.WAD,
              indexOnPool: e.args[config.poolSupplyIndex as keyof typeof e.args] as BigNumber,
              indexInP2P: e.args[config.p2pSupplyIndex as keyof typeof e.args] as BigNumber,
            },
          ])
        )
      )
      .then((e) => e.flat());
    return [...supplyEvents, ...borrowEvents, ...withdrawEvents, ...repayEvents, ...indexesUpdatedEvents];
  }
}
