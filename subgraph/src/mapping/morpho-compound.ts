import { Borrowed, P2PIndexesUpdated, Repaid, Supplied, Withdrawn } from "../../generated/Morpho/Morpho";
import {
  handleBorrowedInternal,
  handleRepaidInternal,
  handleSuppliedInternal,
  handleWithdrawnInternal,
} from "../mapping-internal";
import { getOrInitMarket } from "../initializer";

export function handleP2PIndexesUpdated(event: P2PIndexesUpdated): void {
  const market = getOrInitMarket(event.params._poolTokenAddress, event.block.timestamp);

  market.lastP2PBorrowIndex = event.params._p2pBorrowIndex;
  market.lastP2PSupplyIndex = event.params._p2pSupplyIndex;
  market.lastPoolBorrowIndex = event.params._poolBorrowIndex;
  market.lastPoolSupplyIndex = event.params._poolSupplyIndex;
  market.save();
}

export function handleBorrowed(event: Borrowed): void {
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._borrower;
  handleBorrowedInternal(event, marketAddress, userAddress, event.params._balanceOnPool, event.params._balanceInP2P);
}

export function handleRepaid(event: Repaid): void {
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._onBehalf;
  handleRepaidInternal(event, marketAddress, userAddress, event.params._balanceOnPool, event.params._balanceInP2P);
}

export function handleSupplied(event: Supplied): void {
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._onBehalf;
  handleSuppliedInternal(event, marketAddress, userAddress, event.params._balanceOnPool, event.params._balanceInP2P);
}

export function handleWithdrawn(event: Withdrawn): void {
  const marketAddress = event.params._poolTokenAddress;
  const userAddress = event.params._supplier;
  handleWithdrawnInternal(event, marketAddress, userAddress, event.params._balanceOnPool, event.params._balanceInP2P);
}
