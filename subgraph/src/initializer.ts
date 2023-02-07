import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

import { Balance, Market, MarketEpochDistribution, User } from "../generated/schema";

import { WAD, initialIndex } from "./constants";
import { fetchDistributionFromDistributionId, ipfsJson } from "./distributions";

export function getOrInitUser(userAddress: Address): User {
  let user = User.load(userAddress.toHexString());

  if (!user) {
    user = new User(userAddress.toHexString());
    user.address = userAddress;
    user.save();
  }

  return user;
}

export function getOrInitBalance(userAddress: Address, marketAddress: Address, currentTimestamp: BigInt): Balance {
  const id = `${userAddress.toHexString()}-${marketAddress.toHexString()}`;

  let balance = Balance.load(id);
  if (!balance) {
    const market = getOrInitMarket(marketAddress, currentTimestamp);

    balance = new Balance(id);
    balance.timestamp = currentTimestamp;
    balance.blockNumber = 0;
    balance.market = market.id;
    balance.user = getOrInitUser(userAddress).id;

    // V1 distribution mechanism properties
    balance.userBorrowIndex = market.borrowIndex;
    balance.userSupplyIndex = market.supplyIndex;
    balance.underlyingSupplyBalance = BigInt.zero();
    balance.underlyingBorrowBalance = BigInt.zero();

    // V2 distribution mechanism properties
    balance.scaledSupplyOnPool = BigInt.zero();
    balance.scaledSupplyInP2P = BigInt.zero();

    balance.scaledBorrowOnPool = BigInt.zero();
    balance.scaledBorrowInP2P = BigInt.zero();

    balance.userSupplyOnPoolIndex = market.lastPoolSupplyIndex;
    balance.userSupplyInP2PIndex = market.lastP2PSupplyIndex;
    balance.userBorrowOnPoolIndex = market.lastPoolBorrowIndex;
    balance.userBorrowInP2PIndex = market.lastP2PBorrowIndex;

    // Initialize the number of MORPHO distributed to zero.
    balance.accumulatedMorpho = BigInt.zero();
    balance.accumulatedBorrowMorpho = BigInt.zero();
    balance.accumulatedSupplyMorpho = BigInt.zero();
    balance.save();
  }

  return balance;
}

export function getOrInitMarket(poolTokenAddress: Address, currentTimestamp: BigInt): Market {
  let market = Market.load(poolTokenAddress.toHexString());

  if (!market) {
    market = new Market(poolTokenAddress.toHexString());
    market.address = poolTokenAddress;

    // V1 distribution mechanism properties
    market.borrowIndex = initialIndex;
    market.supplyIndex = initialIndex;

    market.lastTotalSupply = BigInt.zero();
    market.lastTotalBorrow = BigInt.zero();

    // V2 distribution mechanism properties
    market.scaledSupplyOnPool = BigInt.zero();
    market.scaledSupplyInP2P = BigInt.zero();
    market.scaledBorrowOnPool = BigInt.zero();
    market.scaledBorrowInP2P = BigInt.zero();

    market.poolSupplyIndex = BigInt.zero();
    market.p2pSupplyIndex = BigInt.zero();

    market.poolBorrowIndex = BigInt.zero();
    market.p2pBorrowIndex = BigInt.zero();

    market.supplyUpdateBlockTimestamp = currentTimestamp;
    market.borrowUpdateBlockTimestamp = currentTimestamp;
    market.lastPoolSupplyIndex = WAD;
    market.lastP2PSupplyIndex = WAD;
    market.lastPoolBorrowIndex = WAD;
    market.lastP2PBorrowIndex = WAD;

    market.save();
  }

  return market;
}
export function getOrInitMarketEpoch(
  poolTokenAddress: Address,
  epochId: string,
  marketSide: string,
  currentTimestamp: BigInt
): MarketEpochDistribution {
  const id = epochId + "-" + poolTokenAddress.toHexString();
  let marketEpoch = MarketEpochDistribution.load(id);
  if (!marketEpoch) {
    const obj = ipfsJson();
    const speed = fetchDistributionFromDistributionId(
      obj,
      epochId + "-" + marketSide + "-" + poolTokenAddress.toHexString()
    );
    marketEpoch = new MarketEpochDistribution(id);
    const market = getOrInitMarket(poolTokenAddress, currentTimestamp);
    market.save();
    marketEpoch.market = market.id;
    marketEpoch.epoch = epochId;
    marketEpoch.marketSide = marketSide;
    marketEpoch.index = marketSide === "Supply" ? market.supplyIndex : market.borrowIndex;
    marketEpoch.isFinished = false;
    marketEpoch.timestamp = currentTimestamp;
    marketEpoch.speed = speed;
    if (Bytes.fromUTF8(marketSide).equals(Bytes.fromUTF8("Supply"))) {
      // V1
      marketEpoch.index = market.supplyIndex;

      // V2
      marketEpoch.poolIndex = market.poolSupplyIndex;
      marketEpoch.p2pIndex = market.p2pSupplyIndex;
      marketEpoch.totalScaledP2P = market.scaledSupplyInP2P;
      marketEpoch.totalScaledPool = market.scaledSupplyOnPool;
    } else {
      // V1
      marketEpoch.index = market.borrowIndex;

      // V2
      marketEpoch.poolIndex = market.poolBorrowIndex;
      marketEpoch.p2pIndex = market.p2pBorrowIndex;
      marketEpoch.totalScaledP2P = market.scaledBorrowInP2P;
      marketEpoch.totalScaledPool = market.scaledBorrowOnPool;
    }

    marketEpoch.poolSpeed = BigInt.zero();
    marketEpoch.p2pSpeed = BigInt.zero();

    marketEpoch.save();
  }

  return marketEpoch;
}
