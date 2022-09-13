import { Address, BigInt, log } from "@graphprotocol/graph-ts";

import { Balance, Market, MarketEpochDistribution, User } from "../generated/schema";

import { emissions, initialIndex, WAD } from "./constants";

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
    balance.userBorrowIndex = market.borrowIndex;
    balance.userSupplyIndex = market.supplyIndex;
    balance.underlyingSupplyBalance = BigInt.zero();
    balance.underlyingBorrowBalance = BigInt.zero();
    balance.unclaimedMorpho = BigInt.zero();

    balance.save();
  }

  return balance;
}

export function getOrInitMarket(poolTokenAddress: Address, currentTimestamp: BigInt): Market {
  let market = Market.load(poolTokenAddress.toHexString());

  if (!market) {
    market = new Market(poolTokenAddress.toHexString());
    market.address = poolTokenAddress;
    market.borrowIndex = initialIndex;
    market.supplyIndex = initialIndex;
    market.supplyUpdateBlockTimestamp = currentTimestamp;
    market.borrowUpdateBlockTimestamp = currentTimestamp;
    market.lastPoolSupplyIndex = WAD;
    market.lastP2PSupplyIndex = WAD;
    market.lastPoolBorrowIndex = WAD;
    market.lastP2PBorrowIndex = WAD;
    market.lastTotalSupply = BigInt.zero();
    market.lastTotalBorrow = BigInt.zero();

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
    const emissionId = epochId + "-" + marketSide;
    if (!emissions.has(emissionId)) log.critical("Unknown epoch id: {}", [epochId]);
    const marketEmission = emissions.get(emissionId);
    let speed: BigInt;
    if (marketEmission.has(poolTokenAddress.toHexString())) speed = marketEmission.get(poolTokenAddress.toHexString());
    else speed = BigInt.zero();
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
    marketEpoch.save();
  }

  return marketEpoch;
}
