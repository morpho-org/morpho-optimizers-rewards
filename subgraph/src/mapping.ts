import { Borrowed, Morpho, Repaid, Supplied, Withdrawn } from "../generated/Morpho/Morpho";
import { getOrIniBalance, getOrInitMarket } from "./initializer";
import { Transaction } from "../generated/schema";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { WAD } from "./math";
import { CToken } from "../generated/Morpho/CToken";
const startEpochBlockNumber = BigInt.fromI32(100000 as i32);

const endEpochBlockNumber = BigInt.fromI32(18000 as i32);
const morphoAddresString = "0x8888882f8f843896699869179fb6e4f7e3b58888";
export function getUnderlyingBorrowBalance(
  morphoAddress: Address,
  marketAddress: Address,
  balanceOnPool: BigInt,
  balanceInP2P: BigInt
): BigInt {
  const morpho = Morpho.bind(Address.fromString(morphoAddresString));
  const lastPoolIndexes = morpho.lastPoolIndexes(marketAddress);
  const p2pBorrowIndex = morpho.p2pBorrowIndex(marketAddress);

  return balanceOnPool
    .times(lastPoolIndexes.value2)
    .plus(balanceInP2P)
    .times(p2pBorrowIndex)
    .div(BigInt.fromI32(10 as i32).pow(18 as u8));
}

export function getUnderlyingSupplyBalance(
  morphoAddress: Address,
  marketAddress: Address,
  balanceOnPool: BigInt,
  balanceInP2P: BigInt
): BigInt {
  const morpho = Morpho.bind(Address.fromString(morphoAddresString));
  const lastPoolIndexes = morpho.lastPoolIndexes(marketAddress);
  const p2pSupplyIndex = morpho.p2pSupplyIndex(marketAddress);

  const underlyingSupplyBalance = balanceOnPool
    .times(lastPoolIndexes.value1)
    .plus(balanceInP2P)
    .times(p2pSupplyIndex)
    .div(BigInt.fromI32(10 as i32).pow(18 as u8));
  return underlyingSupplyBalance;
}

export function updateSupplyIndex(marketAddress: Address, blockNumber: BigInt): BigInt {
  if(blockNumber.le(startEpochBlockNumber)) return WAD();
  const market = getOrInitMarket(marketAddress);
  if(market.supplyUpdateBlockNumber.equals(blockNumber)) return market.supplyIndex;
  const morpho = Morpho.bind(Address.fromString(morphoAddresString));
  const cToken = CToken.bind(marketAddress);
  const delta = morpho.deltas(marketAddress);
  const totalP2PSupply = delta.value2.times(morpho.p2pSupplyIndex(marketAddress)).div(WAD());
  const totalPoolSupply = cToken.balanceOfUnderlying(Address.fromString(morphoAddresString));
  const totalSupplyUnderlying = totalP2PSupply.plus(totalPoolSupply);
  const speed = BigInt.zero();
  const morphoAccrued = blockNumber.minus(market.supplyUpdateBlockNumber).times(speed);
  const ratio = morphoAccrued.times(BigInt.fromI32(10).pow(36 as u8)).div(totalSupplyUnderlying);
  const newMorphoSupplyIndex = market.supplyIndex.plus(ratio);
  market.supplyIndex = newMorphoSupplyIndex;
  market.supplyUpdateBlockNumber = blockNumber;
  market.save();
  return newMorphoSupplyIndex;
}
export function updateBorrowIndex(marketAddress: Address, blockNumber: BigInt): BigInt {
  if(blockNumber.le(startEpochBlockNumber)) return WAD();
  const market = getOrInitMarket(marketAddress);
  if(market.borrowIndexBlockNumber.ge(blockNumber)) return market.borrowIndex;
  const morpho = Morpho.bind(Address.fromString(morphoAddresString));
  const cToken = CToken.bind(marketAddress);
  const delta = morpho.deltas(marketAddress);
  const totalP2PBorrow = delta.value2.times(morpho.p2pSupplyIndex(marketAddress)).div(WAD());
  const totalPoolBorrow = cToken.borrowBalanceStored(Address.fromString(morphoAddresString));
  const totalBorrowUnderlying = totalP2PBorrow.plus(totalPoolBorrow);
  const speed = BigInt.zero();
  const morphoAccrued = blockNumber.minus(market.borrowIndexBlockNumber).times(speed);
  const ratio = morphoAccrued.times(BigInt.fromI32(10).pow(36 as u8)).div(totalBorrowUnderlying);
  const newMorphoBorrowIndex = market.borrowIndex.plus(ratio);
  market.supplyIndex = newMorphoBorrowIndex;
  market.supplyUpdateBlockNumber = blockNumber;
  market.save();
  return newMorphoBorrowIndex;
}

function accrueBorrowerMorpho(user: Address, marketAddress: Address, prevBalance: BigInt, newIndex: BigInt) {
  const balance = getOrIniBalance(user, marketAddress);
  return prevBalance.times(newIndex.minus(balance.userBorrowIndex)).div(BigInt.fromI32(10).pow(36 as u8));
}
function accrueSupplierMorpho(user: Address, marketAddress: Address, prevBalance: BigInt, newIndex: BigInt) {
  const balance = getOrIniBalance(user, marketAddress);
  return prevBalance.times(newIndex.minus(balance.userSupplyIndex)).div(BigInt.fromI32(10).pow(36 as u8));
}

export function handleBorrowed(event: Borrowed): void {
  if(event.block.number.gt(endEpochBlockNumber)) return;
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._borrower;
  const newBorrowIndex = updateBorrowIndex(marketAddress, event.block.number);
  const underlyingBorrowBalance = getUnderlyingBorrowBalance(
    event.address,
    marketAddress,
    event.params._balanceOnPool,
    event.params._balanceInP2P
  );
  const balance = getOrIniBalance(userAddress, marketAddress);
  const prevBalance = balance.underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingBorrowBalance = underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  const unclaimedRewards = accrueBorrowerMorpho(userAddress, marketAddress,prevBalance,newBorrowIndex);
  balance.unclaimedMorpho = balance.unclaimedMorpho.plus(unclaimedRewards);
  balance.userBorrowIndex = newBorrowIndex;
  balance.save();

  const tx = new Transaction(event.transaction.hash.toHexString());
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Borrow";
  tx.underlyingBorrowBalance = underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.save();
}

export function handleRepaid(event: Repaid): void {
  if(event.block.number.gt(endEpochBlockNumber)) return;
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._onBehalf;
  const newBorrowIndex = updateBorrowIndex(marketAddress, event.block.number);
  const underlyingBorrowBalance = getUnderlyingBorrowBalance(
    event.address,
    marketAddress,
    event.params._balanceOnPool,
    event.params._balanceInP2P
  );
  const balance = getOrIniBalance(userAddress, marketAddress);
  const prevBalance = balance.underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingBorrowBalance = underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  const unclaimedRewards = accrueBorrowerMorpho(userAddress, marketAddress,prevBalance,newBorrowIndex);
  balance.unclaimedMorpho = balance.unclaimedMorpho.plus(unclaimedRewards);
  balance.userBorrowIndex = newBorrowIndex;

  balance.save();

  const tx = new Transaction(event.transaction.hash.toHexString());
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Repay";
  tx.underlyingBorrowBalance = underlyingBorrowBalance;
  tx.underlyingSupplyBalance = balance.underlyingSupplyBalance;
  tx.save();
}

export function handleSupplied(event: Supplied): void {
  if(event.block.number.gt(endEpochBlockNumber)) return;
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._onBehalf;
  const newSupplyIndex = updateSupplyIndex(marketAddress, event.block.number);
  const underlyingSupplyBalance = getUnderlyingSupplyBalance(
    event.address,
    marketAddress,
    event.params._balanceOnPool,
    event.params._balanceInP2P
  );
  const balance = getOrIniBalance(userAddress, marketAddress);
  const prevBalance = balance.underlyingSupplyBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingSupplyBalance = underlyingSupplyBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  const unclaimedRewards = accrueSupplierMorpho(userAddress, marketAddress,prevBalance,newSupplyIndex);
  balance.unclaimedMorpho = balance.unclaimedMorpho.plus(unclaimedRewards);
  balance.userSupplyIndex = newSupplyIndex;
  balance.save();

  const tx = new Transaction(event.transaction.hash.toHexString());
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Supply";
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = underlyingSupplyBalance;
  tx.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  if(event.block.number.gt(endEpochBlockNumber)) return;
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._supplier;
  const newSupplyIndex = updateSupplyIndex(marketAddress, event.block.number);
  const underlyingSupplyBalance = getUnderlyingSupplyBalance(
    event.address,
    marketAddress,
    event.params._balanceOnPool,
    event.params._balanceInP2P
  );
  const balance = getOrIniBalance(userAddress, marketAddress);
  const prevBalance = balance.underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingSupplyBalance = underlyingSupplyBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  const unclaimedRewards = accrueSupplierMorpho(userAddress, marketAddress,prevBalance,newSupplyIndex);
  balance.unclaimedMorpho = balance.unclaimedMorpho.plus(unclaimedRewards);
  balance.userSupplyIndex = newSupplyIndex;
  balance.save();

  const tx = new Transaction(event.transaction.hash.toHexString());
  tx.timestamp = event.block.timestamp;
  tx.blockNumber = event.block.number.toI32();
  tx.market = marketAddress.toHexString();
  tx.user = userAddress.toHexString();
  tx.type = "Withdraw";
  tx.underlyingBorrowBalance = balance.underlyingBorrowBalance;
  tx.underlyingSupplyBalance = underlyingSupplyBalance;
  tx.save();
}
