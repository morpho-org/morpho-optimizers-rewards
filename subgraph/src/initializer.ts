import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Balance, Market, User } from "../generated/schema";
import { initialIndex } from "./constants";

export function getOrInitUser(userAddress: Address): User {
  let user = User.load(userAddress.toHexString());
  if (user === null) {
    user = new User(userAddress.toHexString());
    user.address = userAddress;
    user.save();
  }
  return user;
}
export function getOrIniBalance(userAddress: Address, marketAddress: Address): Balance {
  const id = `${userAddress.toHexString()}-${marketAddress.toHexString()}`;
  let balance = Balance.load(id);
  if (balance === null) {
    balance = new Balance(id);
    const market = getOrInitMarket(marketAddress);
    balance.timestamp = BigInt.zero();
    balance.blockNumber = 0;
    balance.market = market.id;
    balance.user = getOrInitUser(userAddress).id;
    balance.userBorrowIndex = market.borrowIndex;
    balance.userSupplyIndex = market.supplyIndex;
    balance.underlyingSupplyBalance = BigInt.zero();
    balance.underlyingBorrowBalance = BigInt.zero();
    balance.unclaimedMorpho = BigInt.zero();
  }
  return balance;
}

export function getOrInitMarket(poolTokenAddress: Address): Market {
  let market = Market.load(poolTokenAddress.toHexString());
  if (!market) {
    market = new Market(poolTokenAddress.toHexString());
    market.address = poolTokenAddress;
    market.borrowIndex = initialIndex();
    market.supplyIndex = initialIndex();
    market.save();
  }
  return market;
}
