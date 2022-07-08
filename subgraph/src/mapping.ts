import {
  Borrowed,
  BorrowerPositionUpdated, P2PIndexesUpdated,
  Repaid,
  Supplied,
  SupplierPositionUpdated,
  Withdrawn,
} from "../generated/Morpho/Morpho";
import { getOrIniBalance, getOrInitMarket } from "./initializer";
import { PositionUpdate, Transaction } from "../generated/schema";
import { getUnderlyingBorrowBalance, getUnderlyingSupplyBalance } from "./balances";
import { accrueMorphoTokens, updateBorrowIndex, updateSupplyIndex } from "./indexes";
import { endEpochBlockTimestamp } from "./config";
import { ERC20 } from "../generated/Morpho/ERC20";
import { Address } from "@graphprotocol/graph-ts";
import { CToken } from "../generated/Morpho/CToken";
const getDecimals = (poolToken: Address): number => {
  const cToken = CToken.bind(poolToken);
  const underlying = cToken.try_underlying();
  if (underlying.reverted) return 18; // wEth

  const erc20 = ERC20.bind(underlying.value);
  return erc20.decimals();
};
export function handleP2PIndexesUpdated(event: P2PIndexesUpdated): void {
  const market = getOrInitMarket(event.params._poolTokenAddress, event.block.timestamp, 0);
  market.lastP2PBorrowIndex = event.params._p2pBorrowIndex;
  market.lastP2PSupplyIndex = event.params._p2pSupplyIndex;
  market.lastPoolBorrowIndex = event.params._poolBorrowIndex;
  market.lastPoolSupplyIndex = event.params._poolSupplyIndex;
  market.save();
}

export function handleBorrowed(event: Borrowed): void {
  if (event.block.timestamp.gt(endEpochBlockTimestamp)) return;
  const decimals = getDecimals(event.params._poolTokenAddress);
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._borrower;
  const newBorrowIndex = updateBorrowIndex(marketAddress, event.block.timestamp, decimals);
  const underlyingBorrowBalance = getUnderlyingBorrowBalance(
    event.address,
    marketAddress,
    event.params._balanceOnPool,
    event.params._balanceInP2P,
  );
  const balance = getOrIniBalance(userAddress, marketAddress, event.block.timestamp, decimals);
  const prevBalance = balance.underlyingBorrowBalance;
  const prevScaledBalanceOnPool = balance.borrowOnPool;
  const prevScaledBalanceP2P = balance.borrowP2P;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingBorrowBalance = underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  const unclaimedRewards = accrueMorphoTokens(newBorrowIndex, balance.userBorrowIndex, prevBalance);
  balance.borrowP2P = event.params._balanceInP2P;
  balance.borrowOnPool = event.params._balanceOnPool;
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

  const market = getOrInitMarket(marketAddress, event.block.timestamp, decimals);
  market.totalBorrowP2P = market.totalBorrowP2P.plus(event.params._balanceInP2P).minus(prevScaledBalanceP2P);
  market.totalBorrowOnPool = market.totalBorrowOnPool.plus(event.params._balanceOnPool).minus(prevScaledBalanceOnPool);
  market.save();
}

export function handleRepaid(event: Repaid): void {
  if (event.block.timestamp.gt(endEpochBlockTimestamp)) return;
  const decimals = getDecimals(event.params._poolTokenAddress);
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._onBehalf;
  const newBorrowIndex = updateBorrowIndex(marketAddress, event.block.timestamp, decimals);
  const underlyingBorrowBalance = getUnderlyingBorrowBalance(
    event.address,
    marketAddress,
    event.params._balanceOnPool,
    event.params._balanceInP2P,
  );
  const balance = getOrIniBalance(userAddress, marketAddress, event.block.timestamp, decimals);
  const prevBalance = balance.underlyingBorrowBalance;
  const prevScaledBalanceOnPool = balance.borrowOnPool;
  const prevScaledBalanceP2P = balance.borrowP2P;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingBorrowBalance = underlyingBorrowBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  const unclaimedRewards = accrueMorphoTokens(newBorrowIndex, balance.userBorrowIndex, prevBalance);
  balance.borrowP2P = event.params._balanceInP2P;
  balance.borrowOnPool = event.params._balanceOnPool;
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

  // Update the balance to track total morpho balance in real time
  const market = getOrInitMarket(marketAddress, event.block.timestamp, decimals);
  market.totalBorrowP2P = market.totalBorrowP2P.plus(event.params._balanceInP2P).minus(prevScaledBalanceP2P);
  market.totalBorrowOnPool = market.totalBorrowOnPool.plus(event.params._balanceOnPool).minus(prevScaledBalanceOnPool);
  market.save();
}

export function handleSupplied(event: Supplied): void {
  if (event.block.timestamp.gt(endEpochBlockTimestamp)) return;
  const decimals = getDecimals(event.params._poolTokenAddress);
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._onBehalf;
  const newSupplyIndex = updateSupplyIndex(marketAddress, event.block.timestamp, decimals);
  const underlyingSupplyBalance = getUnderlyingSupplyBalance(
    event.address,
    marketAddress,
    event.params._balanceOnPool,
    event.params._balanceInP2P,
  );
  const balance = getOrIniBalance(userAddress, marketAddress, event.block.timestamp, decimals);
  const prevBalance = balance.underlyingSupplyBalance;
  const prevScaledBalanceOnPool = balance.supplyOnPool;
  const prevScaledBalanceP2P = balance.supplyP2P;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingSupplyBalance = underlyingSupplyBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  const unclaimedRewards = accrueMorphoTokens(newSupplyIndex, balance.userSupplyIndex, prevBalance);
  balance.unclaimedMorpho = balance.unclaimedMorpho.plus(unclaimedRewards);
  balance.userSupplyIndex = newSupplyIndex;
  balance.supplyP2P = event.params._balanceInP2P;
  balance.supplyOnPool = event.params._balanceOnPool;
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

  // Update the balance to track total morpho balance in real time
  const market = getOrInitMarket(marketAddress, event.block.timestamp, decimals);
  market.totalSupplyP2P = market.totalSupplyP2P.plus(event.params._balanceInP2P).minus(prevScaledBalanceP2P);
  market.totalSupplyOnPool = market.totalSupplyOnPool.plus(event.params._balanceOnPool).minus(prevScaledBalanceOnPool);
  market.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  if (event.block.timestamp.gt(endEpochBlockTimestamp)) return;
  const decimals = getDecimals(event.params._poolTokenAddress);
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._supplier;
  const newSupplyIndex = updateSupplyIndex(marketAddress, event.block.timestamp, decimals); // we use the previous underlying balance
  const underlyingSupplyBalance = getUnderlyingSupplyBalance(
    event.address,
    marketAddress,
    event.params._balanceOnPool,
    event.params._balanceInP2P,
  );
  const balance = getOrIniBalance(userAddress, marketAddress, event.block.timestamp, decimals);
  const prevBalance = balance.underlyingSupplyBalance;
  const prevScaledBalanceOnPool = balance.supplyOnPool;
  const prevScaledBalanceP2P = balance.supplyP2P;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;

  balance.underlyingSupplyBalance = underlyingSupplyBalance;
  balance.blockNumber = event.block.number.toI32();
  balance.timestamp = event.block.timestamp;
  balance.supplyP2P = event.params._balanceInP2P;
  balance.supplyOnPool = event.params._balanceOnPool;
  const unclaimedRewards = accrueMorphoTokens(newSupplyIndex, balance.userSupplyIndex, prevBalance);
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

  // Update the balance to track total morpho balance in real time
  const market = getOrInitMarket(marketAddress, event.block.timestamp, decimals);
  market.totalSupplyP2P = market.totalSupplyP2P.plus(event.params._balanceInP2P).minus(prevScaledBalanceP2P);
  market.totalSupplyOnPool = market.totalSupplyOnPool.plus(event.params._balanceOnPool).minus(prevScaledBalanceOnPool);
  market.save();
}

export function handleBorrowerPositionUpdated(event: BorrowerPositionUpdated): void {
  if (event.block.timestamp.gt(endEpochBlockTimestamp)) return;
  const decimals = getDecimals(event.params._poolTokenAddress);
  updateBorrowIndex(event.params._poolTokenAddress, event.block.timestamp, decimals);

  const marketAddress = event.params._poolTokenAddress;
  const balance = getOrIniBalance(event.params._user, marketAddress, event.block.timestamp, decimals);
  const previousP2PBalance = balance.borrowP2P;
  const previousBalanceOnPool = balance.borrowOnPool;

  balance.borrowP2P = event.params._balanceInP2P;
  balance.borrowOnPool = event.params._balanceOnPool;

  balance.save();

  // Update the balance to track total morpho balance in real time
  const market = getOrInitMarket(marketAddress, event.block.timestamp, decimals);
  market.totalBorrowOnPool = market.totalBorrowOnPool.plus(event.params._balanceOnPool).minus(previousBalanceOnPool);
  market.totalBorrowP2P = market.totalBorrowP2P.plus(event.params._balanceInP2P).minus(previousP2PBalance);
  market.save();
  const positionUpdate = new PositionUpdate(
    `${event.transaction.hash.toHex()}-${event.params._user.toHex()}-${event.params._poolTokenAddress.toHex()}-${event.logIndex
      .toI32()
      .toString()}-Borrow`,
  );
  positionUpdate.market = marketAddress.toHex();
  positionUpdate.type = "Borrow";
  positionUpdate.user = balance.user;
  positionUpdate.eventTimestamp = event.block.timestamp.toI32();
  positionUpdate.balanceOnPool = event.params._balanceOnPool;
  positionUpdate.balanceInP2P = event.params._balanceInP2P;
  positionUpdate.save();
}

export function handleSupplierPositionUpdated(event: SupplierPositionUpdated): void {
  if (event.block.timestamp.gt(endEpochBlockTimestamp)) return;
  const decimals = getDecimals(event.params._poolTokenAddress);
  updateSupplyIndex(event.params._poolTokenAddress, event.block.timestamp, decimals);
  const marketAddress = event.params._poolTokenAddress;
  const balance = getOrIniBalance(event.params._user, marketAddress, event.block.timestamp, decimals);
  const previousP2PBalance = balance.supplyP2P;
  const previousBalanceOnPool = balance.supplyOnPool;

  balance.supplyP2P = event.params._balanceInP2P;
  balance.supplyOnPool = event.params._balanceOnPool;

  balance.save();

  const market = getOrInitMarket(marketAddress, event.block.timestamp, decimals);
  market.totalSupplyOnPool = market.totalSupplyOnPool.plus(event.params._balanceOnPool).minus(previousBalanceOnPool);
  market.totalSupplyP2P = market.totalSupplyP2P.plus(event.params._balanceInP2P).minus(previousP2PBalance);
  market.save();
  const positionUpdate = new PositionUpdate(
    `${event.transaction.hash.toHex()}-${event.params._user.toHex()}-${event.params._poolTokenAddress.toHex()}-${event.logIndex
      .toI32()
      .toString()}-Supply`,
  );
  positionUpdate.market = marketAddress.toHex();
  positionUpdate.type = "Supply";
  positionUpdate.user = balance.user;
  positionUpdate.eventTimestamp = event.block.timestamp.toI32();
  positionUpdate.balanceOnPool = event.params._balanceOnPool;
  positionUpdate.balanceInP2P = event.params._balanceInP2P;
  positionUpdate.save();
}
