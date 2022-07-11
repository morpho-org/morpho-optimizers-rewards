import { Address, BigInt } from "@graphprotocol/graph-ts";

import { Balance, Market, User } from "../generated/schema";

import { initialIndex, WAD } from "./constants";

export function getOrInitUser(userAddress: Address): User {
  let user = User.load(userAddress.toHexString());

  if (!user) {
    user = new User(userAddress.toHexString());
    user.address = userAddress;
    user.save();
  }

  return user;
}

export function getOrInitBalance(
  userAddress: Address,
  marketAddress: Address,
  currentTimestamp: BigInt,
  decimals: number
): Balance {
  const id = `${userAddress.toHexString()}-${marketAddress.toHexString()}`;

  let balance = Balance.load(id);
  if (!balance) {
    balance = new Balance(id);

    const market = getOrInitMarket(marketAddress, currentTimestamp, decimals);
    balance.timestamp = currentTimestamp;
    balance.blockNumber = 0;
    balance.market = market.id;
    balance.user = getOrInitUser(userAddress).id;
    balance.userBorrowIndex = market.borrowIndex;
    balance.userSupplyIndex = market.supplyIndex;
    balance.underlyingSupplyBalance = BigInt.zero();
    balance.underlyingBorrowBalance = BigInt.zero();
    balance.unclaimedMorpho = BigInt.zero();
    balance.supplyOnPool = BigInt.zero();
    balance.supplyP2P = BigInt.zero();
    balance.borrowOnPool = BigInt.zero();
    balance.borrowP2P = BigInt.zero();

    balance.save();
  }

  return balance;
}

export function getOrInitMarket(
  poolTokenAddress: Address,
  currentTimestamp: BigInt,
  decimals: number
): Market {
  let market = Market.load(poolTokenAddress.toHexString());

  if (!market) {
    market = new Market(poolTokenAddress.toHexString());
    market.address = poolTokenAddress;
    market.decimals = decimals as i32;
    market.borrowIndex = initialIndex;
    market.supplyIndex = initialIndex;
    market.supplyUpdateBlockTimestamp = currentTimestamp;
    market.borrowUpdateBlockTimestamp = currentTimestamp;
    market.totalSupplyOnPool = BigInt.zero();
    market.totalSupplyP2P = BigInt.zero();
    market.totalBorrowOnPool = BigInt.zero();
    market.totalBorrowP2P = BigInt.zero();
    market.lastPoolSupplyIndex = WAD;
    market.lastP2PSupplyIndex = WAD;
    market.lastPoolBorrowIndex = WAD;
    market.lastP2PBorrowIndex = WAD;

    market.save();
  }

  return market;
}
