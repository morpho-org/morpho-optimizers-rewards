import {
  Borrowed,
  Morpho,
  Repaid,
  Supplied,
  Withdrawn,
} from "../generated/Morpho/Morpho";
import { getOrInitUser } from "./initializer";
import { Balance } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleBorrowed(event: Borrowed): void {
  const marketAddress = event.params._poolTokenAddress;
  const user = getOrInitUser(event.params._borrower);
  const balance = new Balance(event.transaction.hash.toHexString());
  balance.market = marketAddress;
  balance.user = user.id;
  balance.type = "Borrow";

  const morpho = Morpho.bind(event.address);
  const lastPoolIndexes = morpho.lastPoolIndexes(marketAddress);
  const p2pSupplyIndex = morpho.p2pSupplyIndex(marketAddress);
  const p2pBorrowIndex = morpho.p2pBorrowIndex(marketAddress);

  const supplyBalanceInOf = morpho.supplyBalanceInOf(
    marketAddress,
    event.params._borrower
  );
  balance.underlyingSupplyBalance = supplyBalanceInOf.value0
    .times(lastPoolIndexes.value1)
    .plus(supplyBalanceInOf.value1.times(p2pSupplyIndex))
    .div(BigInt.fromI32(10 as i32).pow(18 as u8));
  balance.underlyingBorrowBalance = event.params._balanceOnPool
    .times(lastPoolIndexes.value2)
    .plus(event.params._balanceInP2P)
    .times(p2pBorrowIndex)
    .div(BigInt.fromI32(10 as i32).pow(18 as u8));

  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  balance.save();
}
export function handleRepaid(event: Repaid): void {
  const marketAddress = event.params._poolTokenAddress;
  const user = getOrInitUser(event.params._onBehalf);
  const balance = new Balance(event.transaction.hash.toHexString());
  balance.market = marketAddress;
  balance.user = user.id;
  balance.type = "Borrow";

  const morpho = Morpho.bind(event.address);
  const lastPoolIndexes = morpho.lastPoolIndexes(marketAddress);
  const p2pSupplyIndex = morpho.p2pSupplyIndex(marketAddress);
  const p2pBorrowIndex = morpho.p2pBorrowIndex(marketAddress);

  const supplyBalanceInOf = morpho.supplyBalanceInOf(
    marketAddress,
    event.params._onBehalf
  );
  balance.underlyingSupplyBalance = supplyBalanceInOf.value0
    .times(lastPoolIndexes.value1)
    .plus(supplyBalanceInOf.value1.times(p2pSupplyIndex))
    .div(BigInt.fromI32(10 as i32).pow(18 as u8));
  balance.underlyingBorrowBalance = event.params._balanceOnPool
    .times(lastPoolIndexes.value2)
    .plus(event.params._balanceInP2P)
    .times(p2pBorrowIndex)
    .div(BigInt.fromI32(10 as i32).pow(18 as u8));

  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  balance.save();
}

export function handleSupplied(event: Supplied): void {
  const marketAddress = event.params._poolTokenAddress;
  const user = getOrInitUser(event.params._onBehalf);
  const balance = new Balance(event.transaction.hash.toHexString());
  balance.market = marketAddress;
  balance.user = user.id;
  balance.type = "Borrow";

  const morpho = Morpho.bind(event.address);
  const lastPoolIndexes = morpho.lastPoolIndexes(marketAddress);
  const p2pSupplyIndex = morpho.p2pSupplyIndex(marketAddress);
  const p2pBorrowIndex = morpho.p2pBorrowIndex(marketAddress);

  const borrowBalanceInOf = morpho.borrowBalanceInOf(
    marketAddress,
    event.params._onBehalf
  );
  balance.underlyingBorrowBalance = borrowBalanceInOf.value0
    .times(lastPoolIndexes.value2)
    .plus(borrowBalanceInOf.value1.times(p2pBorrowIndex))
    .div(BigInt.fromI32(10 as i32).pow(18 as u8));
  balance.underlyingSupplyBalance = event.params._balanceOnPool
    .times(lastPoolIndexes.value1)
    .plus(event.params._balanceInP2P)
    .times(p2pSupplyIndex)
    .div(BigInt.fromI32(10 as i32).pow(18 as u8));

  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  balance.save();
}
export function handleWithdrawn(event: Withdrawn): void {
  const marketAddress = event.params._poolTokenAddress;
  const user = getOrInitUser(event.params._supplier);
  const balance = new Balance(event.transaction.hash.toHexString());
  balance.market = marketAddress;
  balance.user = user.id;
  balance.type = "Borrow";

  const morpho = Morpho.bind(event.address);
  const lastPoolIndexes = morpho.lastPoolIndexes(marketAddress);
  const p2pSupplyIndex = morpho.p2pSupplyIndex(marketAddress);
  const p2pBorrowIndex = morpho.p2pBorrowIndex(marketAddress);

  const borrowBalanceInOf = morpho.borrowBalanceInOf(
    marketAddress,
    event.params._supplier
  );

  balance.underlyingBorrowBalance = borrowBalanceInOf.value0
    .times(lastPoolIndexes.value2)
    .plus(borrowBalanceInOf.value1.times(p2pBorrowIndex))
    .div(BigInt.fromI32(10 as i32).pow(18 as u8));
  balance.underlyingSupplyBalance = event.params._balanceOnPool
    .times(lastPoolIndexes.value1)
    .plus(event.params._balanceInP2P)
    .times(p2pSupplyIndex)
    .div(BigInt.fromI32(10 as i32).pow(18 as u8));

  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  balance.save();
}
