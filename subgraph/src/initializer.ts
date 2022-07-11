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
