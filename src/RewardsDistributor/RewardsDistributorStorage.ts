import { MarketConfig, UserMarketConfig } from "./MorphoCompoundRewardsDistributor";
import { constants } from "ethers";
import { UserBalances } from "../utils";
import { EpochConfig } from "../ages";

export default class RewardsDistributorStorage {
  public markets: { [marketAddress: string]: MarketConfig } = {};
  public users: {
    [address: string]: {
      [marketAddress: string]: UserMarketConfig;
    };
  } = {};

  public lastBlockSynced: number;
  public currentEpoch?: EpochConfig; // undefined if no epoch are applied

  constructor(initialBlock: number) {
    this.lastBlockSynced = initialBlock;
  }
  // -------------- Store Initializers -----------------
  protected getOrInitUserBalance(address: string, market: string) {
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

  protected getOrInitMarket(address: string) {
    address = address.toLowerCase();
    if (!this.markets[address]) {
      this.markets[address] = {
        address,
        supplyIndex: constants.Zero,
        borrowIndex: constants.Zero,
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

  // ----------- storage getters ----------------------
  get usersBalances(): UserBalances[] {
    return Object.entries(this.users).map(([address, balances]) => ({
      address,
      id: address,
      balances: Object.entries(balances).map(([marketAddress, balance]) => ({
        underlyingSupplyBalance: balance.userSupplyBalance,
        underlyingBorrowBalance: balance.userBorrowBalance,
        userSupplyIndex: balance.userSupplyIndex,
        userBorrowIndex: balance.userBorrowIndex,
        accumulatedMorpho: balance.accruedMorpho,
        market: this.markets[marketAddress],
      })),
    }));
  }

  get isProcessed() {
    return !!this.currentEpoch;
  }

  // ------------- Storage dump ------------------
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
