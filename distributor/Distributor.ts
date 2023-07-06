import { BigNumber, constants, providers } from "ethers";
import { WadRayMath } from "@morpho-labs/ethers-utils/lib/maths";
import { cloneDeep } from "lodash";
import { computeMerkleTree } from "../src/utils";
import { MarketDistributor, parseDate } from "./MarketDistributor";
import { RatesProvider } from "./RatesProvider";
import { ChainEventFetcher } from "./eventFetcher/ChainEventFetcher";

export interface BlockTimestamp {
  readonly block: number;
  readonly timestamp: number;
}

export interface RangeRate {
  readonly from: BlockTimestamp;
  readonly to: BlockTimestamp;
  readonly rate: BigNumber;
}
export interface IRatesProvider {
  getRangeRates(marketSide: string, from: BlockTimestamp, to: BlockTimestamp): readonly RangeRate[];
  marketDistributor: MarketDistributor;
  idToBlockTimestamp: (id: string) => { from: BlockTimestamp; to: { block?: number; timestamp: number } };
}
export interface BaseEvent {
  readonly block: BlockTimestamp;
  readonly transactionIndex: number;
  readonly logIndex: number;
}
export interface TxEvent extends BaseEvent {
  readonly block: BlockTimestamp;
  readonly user: string;

  /**
   * The Pool balance of the user
   */
  readonly onPool: BigNumber;

  /**
   * The P2P balance of the user
   */
  readonly inP2P: BigNumber;

  /**
   * "<marketAddess>-<Supply|Borrow>"
   */
  readonly marketSide: string;
}
export interface IndexesEvent extends BaseEvent {
  /**
   * "<marketAddess>-<Supply|Borrow>"
   */
  readonly marketSide: string;

  /**
   * The Precision of the index, RAY or WAD
   */
  readonly indexPrecision: BigNumber;
  readonly indexOnPool: BigNumber;
  readonly indexInP2P: BigNumber;
}

export interface IEventFetcher {
  /**
   * Get all events from a timestamp range
   * Events will be processed in order
   * @param from The timestamp from which to start
   * @param to The timestamp to which to end
   */
  getEvents: (from: BlockTimestamp, to: BlockTimestamp) => Promise<(TxEvent | IndexesEvent)[]>;

  getLatestBlock: () => Promise<BlockTimestamp>;
}

export interface Market {
  readonly lastUpdate: BlockTimestamp;
  readonly indexOnPool: BigNumber;
  readonly indexInP2P: BigNumber;
  readonly morphoIndex: BigNumber;
  readonly totalUnderlying: BigNumber;
  readonly indexPrecision: BigNumber;
}

export interface User {
  balances: Record<string, Balance | undefined>;
}
export interface Balance {
  readonly market: string;
  readonly totalUnderlying: BigNumber;
  readonly morphoIndex: BigNumber;
  readonly morphoAccrued: BigNumber;
}
export interface ILogger {
  log: (...data: any) => void;
}
export class DistributorV1 {
  static async fromChain(provider: providers.Provider) {
    const marketDistributor = new MarketDistributor(provider);
    const ratesFetcher = new RatesProvider(marketDistributor);

    await ratesFetcher.init();
    console.log("Rates initialized");

    const eventsFetcher = new ChainEventFetcher(provider);

    const distributor = new DistributorV1(ratesFetcher, eventsFetcher);
    const firstEpoch = marketDistributor.configFetcher.getConfigurations(["age1-epoch1"])?.[0];
    if (!firstEpoch || firstEpoch.id !== "age1-epoch1") throw new Error("Invalid initial epoch provided");

    const firstEpochBlock = 14927832;

    // Fetch all users that was coming before the first epoch
    await distributor.run(undefined, {
      block: firstEpochBlock,
      timestamp: parseDate(firstEpoch.initialTimestamp),
    });
    console.log("All events before first epoch fetched");

    return distributor;
  }

  static #initialMorphoBlock = {
    block: 14860866,
    timestamp: Math.floor(new Date("2022-05-28T02:44:49.000Z").getTime() / 1000),
  };
  static #computeMorphoAccrued(lastIndex: BigNumber, newIndex: BigNumber, totalUnderlying: BigNumber) {
    if (lastIndex.gt(newIndex))
      throw new Error(`lastIndex must be lower than newIndex: ${JSON.stringify({ lastIndex, newIndex }, null, 2)}`);
    return newIndex.sub(lastIndex).mul(totalUnderlying).div(WadRayMath.WAD);
  }
  static #computeNewMorphoIndex(rates: readonly RangeRate[], market: Market, toTs: number) {
    const morphoAccrued = rates.reduce((acc, { from, to, rate }) => {
      const tsFrom = Math.max(from.timestamp, market.lastUpdate.timestamp);
      const tsTo = Math.min(to.timestamp, toTs);
      const deltaT = tsTo - tsFrom;
      if (deltaT <= 0) return acc; // No overlap
      return acc.add(rate.mul(deltaT));
    }, constants.Zero);
    if (market.totalUnderlying.isZero() && morphoAccrued.gt(0)) throw new Error("totalUnderlying is zero");
    const accrualIndex = market.totalUnderlying.isZero()
      ? constants.Zero
      : morphoAccrued.mul(WadRayMath.WAD).div(market.totalUnderlying);
    return market.morphoIndex.add(accrualIndex);
  }

  #logger: ILogger = { log: console.log };
  #ratesProvider: IRatesProvider;
  #eventsFetcher: IEventFetcher;

  #markets: Record<string, Market | undefined> = {};
  #users: Record<string, User | undefined> = {};

  #fetchedTo: BlockTimestamp = { block: 0, timestamp: 0 };
  constructor(_ratesProvider: IRatesProvider, _eventsFetcher: IEventFetcher) {
    this.#ratesProvider = _ratesProvider;
    this.#eventsFetcher = _eventsFetcher;
  }

  async runTo(id: string) {
    const { to } = this.#ratesProvider.idToBlockTimestamp(id);
    if (!to.block) throw Error("Invalid range");
    await this.run(undefined, to as BlockTimestamp);
  }
  async run(from?: BlockTimestamp, to?: BlockTimestamp): Promise<void> {
    if (!from) from = DistributorV1.#initialMorphoBlock;
    if (!to) to = await this.#eventsFetcher.getLatestBlock();

    if (from.block > to.block) throw Error("Invalid range");
    if (to.block < this.#fetchedTo.block) throw Error("Invalid range, already fetched");
    if (to.block === this.#fetchedTo.block) {
      console.log("Already fetched to block", to.block);
      return;
    }
    from = {
      block: Math.max(from.block, this.#fetchedTo.block),
      timestamp: Math.max(from.timestamp, this.#fetchedTo.timestamp),
    };
    console.log("Fetching from", from, "to", to);

    const events = await this.#eventsFetcher.getEvents(from, to);
    for (const event of events) {
      this.#logger.log("Processing event", event);
      if (isTxEvent(event)) {
        this.#processTxEvent(event);
      } else {
        this.#processIndexesEvent(event);
      }
    }
    this.#fetchedTo = to;
  }
  #processIndexesEvent(event: IndexesEvent): void {
    const market = this.#getMarket(event.marketSide);
    this.#setMarket(event.marketSide, {
      ...market,
      indexPrecision: event.indexPrecision,
      indexInP2P: event.indexInP2P,
      indexOnPool: event.indexOnPool,
    });
  }

  #processTxEvent(event: TxEvent): void {
    const market = this.#updateMarketIndex(event);

    const balance = this.#getUserBalance(event.user, event.marketSide);

    const newMorphoAccrued = DistributorV1.#computeMorphoAccrued(
      balance.morphoIndex,
      market.morphoIndex,
      balance.totalUnderlying
    );
    const morphoAccrued = balance.morphoAccrued.add(newMorphoAccrued);
    const totalUnderlying = event.onPool
      .mul(market.indexOnPool)
      .add(event.inP2P.mul(market.indexInP2P))
      .div(market.indexPrecision);

    const totalMarketUnderlying = market.totalUnderlying.add(totalUnderlying).sub(balance.totalUnderlying);

    this.#setMarket(event.marketSide, {
      ...market,
      totalUnderlying: totalMarketUnderlying,
    });

    this.#setUserBalance(event.user, event.marketSide, {
      totalUnderlying,
      market: event.marketSide,
      morphoIndex: market.morphoIndex,
      morphoAccrued,
    });
  }

  #updateMarketIndex(event: TxEvent) {
    const market = this.#getMarket(event.marketSide);

    const deltaT = event.block.timestamp - market.lastUpdate.timestamp;
    if (deltaT < 0) throw Error("Invalid deltaT");
    const rates = this.#ratesProvider.getRangeRates(event.marketSide, market.lastUpdate, event.block);
    const hasDistribution = rates.some(({ rate }) => rate.gt(0));
    const morphoIndex = hasDistribution
      ? DistributorV1.#computeNewMorphoIndex(rates, market, event.block.timestamp)
      : market.morphoIndex;
    const newMarket = {
      ...market,
      morphoIndex,
      lastUpdate: event.block,
    };
    this.#setMarket(event.marketSide, newMarket);
    return newMarket;
  }

  #getMarket(market: string): Market {
    if (!this.#markets[market]) {
      this.#markets[market] = {
        lastUpdate: { block: 0, timestamp: 0 },
        indexOnPool: constants.Zero,
        indexInP2P: constants.Zero,
        morphoIndex: constants.Zero,
        indexPrecision: constants.Zero,
        totalUnderlying: constants.Zero,
      };
    }
    return this.#markets[market]!;
  }
  #setMarket(market: string, value: Market): void {
    this.#logger.log("Setting market", market, value);
    this.#markets[market] = value;
  }

  #getUserBalance(user: string, marketSide: string): Balance {
    if (!this.#users[user]) {
      this.#users[user] = { balances: {} };
    }
    if (!this.#users[user]!.balances[marketSide]) {
      const { morphoIndex } = this.#getMarket(marketSide);
      this.#users[user]!.balances[marketSide] = {
        market: marketSide,
        totalUnderlying: constants.Zero,
        morphoIndex,
        morphoAccrued: constants.Zero,
      };
    }
    return this.#users[user]!.balances[marketSide]!;
  }
  #setUserBalance(user: string, balance: string, value: Balance): void {
    this.#logger.log("Setting user balance", user, balance, value);
    if (!this.#users[user]) this.#users[user] = { balances: {} };
    this.#users[user]!.balances[balance] = value;
  }

  getAllStoredUsers(): Record<string, User> {
    return cloneDeep(this.#users as Record<string, User>);
  }
  getAllStoredMarkets(): Record<string, Market> {
    return cloneDeep(this.#markets as Record<string, Market>);
  }
  getAllUpdatedUsers(ts: BlockTimestamp): Record<string, User> {
    const markets = this.getAllUpdatedMarkets(ts);
    return this.#getAllUpdatedUsers(markets);
  }
  #getAllUpdatedUsers(markets: Record<string, Market>): Record<string, User> {
    return Object.fromEntries(
      Object.entries(this.#users).map(([user, b]) => {
        const balances = b!.balances;
        const newBalances = Object.fromEntries(
          Object.entries(balances).map(([id, balance]) => {
            const market = markets[id];
            const newMorphoAccrued = DistributorV1.#computeMorphoAccrued(
              balance!.morphoIndex,
              market.morphoIndex,
              balance!.totalUnderlying
            );

            return [
              id,
              {
                ...balance!,
                morphoAccrued: balance!.morphoAccrued.add(newMorphoAccrued),
              },
            ];
          })
        );
        return [user, { balances: newBalances }];
      })
    );
  }
  getAllUpdatedMarkets(ts: BlockTimestamp): Record<string, Market> {
    if (!this.#fetchedTo) throw Error("Not initialized");
    if (ts.block < this.#fetchedTo.block) throw Error("Invalid timestamp, must be greater than last fetched block");

    return Object.fromEntries(
      Object.entries(this.#markets).map(([id, market]) => [
        id,
        {
          ...market!,
          lastUpdate: ts,
          morphoIndex: DistributorV1.#computeNewMorphoIndex(
            this.#ratesProvider.getRangeRates(id, this.#fetchedTo, ts),
            market!,
            ts.timestamp
          ),
        },
      ])
    );
  }
  getDistributionSnapshot(ts: BlockTimestamp) {
    if (!this.#fetchedTo) throw Error("Not initialized");
    if (ts.block < this.#fetchedTo.block) throw Error("Invalid timestamp, must be greater than last fetched block");
    // Update markets on the fly
    const markets = this.getAllUpdatedMarkets(ts);
    // Update users on the fly
    const users = this.#getAllUpdatedUsers(markets);
    const marketsWithTotalDistributed = Object.fromEntries(
      Object.entries(markets).map(([id, market]) => [
        id,
        {
          ...market,
          totalDistributed: Object.values(users).reduce((acc, { balances }) => {
            const balance = balances[id];
            if (!balance) return acc;
            return acc.add(balance.morphoAccrued);
          }, constants.Zero),
        },
      ])
    );
    const totalDistributed = Object.values(marketsWithTotalDistributed).reduce(
      (acc, { totalDistributed }) => acc.add(totalDistributed),
      constants.Zero
    );
    return {
      markets: marketsWithTotalDistributed,
      users,
      totalDistributed,
    };
  }
  async generateMerkleTree(ts: BlockTimestamp) {
    await this.run(undefined, ts);
    const { users } = this.getDistributionSnapshot(ts);

    // Format users for merkle tree
    const usersForMerkle = Object.entries(users)
      .map(([address, { balances }]) => {
        const accumulatedRewards = Object.values(balances).reduce(
          (acc, balance) => acc.add(balance!.morphoAccrued),
          constants.Zero
        );
        if (accumulatedRewards.isZero()) return;

        return {
          address,
          accumulatedRewards: accumulatedRewards.toString(),
        };
      })
      .filter(isDefined)
      .sort((a, b) => a.address.localeCompare(b.address));

    return computeMerkleTree(usersForMerkle);
  }

  get ratesProvider() {
    return this.#ratesProvider;
  }
  get eventsFetcher() {
    return this.#eventsFetcher;
  }
}

const isTxEvent = (event: TxEvent | IndexesEvent): event is TxEvent => "onPool" in event;

export const isDefined = <T>(x: T | undefined): x is T => x !== undefined;
