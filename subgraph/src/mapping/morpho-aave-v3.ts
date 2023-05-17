/**
 * This file contains the mapping functions for the MorphoAaveV3 contract.
 * Since there is only rewards on the ETH market, we don't need to handle
 * collateral events.
 * Morpho Aave v3 eth is only used for borrowing, and supply only.
 *
 * As a consequence, the behavior is exactly the same as the Morpho Compound
 * one or the Morpho Aave v2 one.
 */

import {
  Borrowed,
  SupplyPositionUpdated,
  IndexesUpdated,
  Repaid,
  Supplied,
  Withdrawn,
  BorrowPositionUpdated,
} from "../../generated/MorphoAaveV3/MorphoAaveV3";
import {
  handleBorrowedInternal,
  handleBorrowerPositionUpdatedInternal,
  handleRepaidInternal,
  handleSuppliedInternal,
  handleSupplierPositionUpdatedInternal,
  handleWithdrawnInternal,
} from "../mapping-internal";
import { getOrInitMarket } from "../initializer";

const RAY_UNITS = 27 as u8;
export function handleIndexesUpdated(event: IndexesUpdated): void {
  const market = getOrInitMarket(event.params.underlying, event.block.timestamp);

  market.lastP2PBorrowIndex = event.params.p2pBorrowIndex;
  market.lastP2PSupplyIndex = event.params.p2pSupplyIndex;
  market.lastPoolBorrowIndex = event.params.poolBorrowIndex;
  market.lastPoolSupplyIndex = event.params.poolSupplyIndex;
  market.save();
}

export function handleBorrowed(event: Borrowed): void {
  const marketAddress = event.params.underlying;
  const userAddress = event.params.onBehalf;
  handleBorrowedInternal(
    event,
    marketAddress,
    userAddress,
    event.params.scaledOnPool,
    event.params.scaledInP2P,
    RAY_UNITS
  );
}

export function handleRepaid(event: Repaid): void {
  const marketAddress = event.params.underlying;
  const userAddress = event.params.onBehalf;
  handleRepaidInternal(
    event,
    marketAddress,
    userAddress,
    event.params.scaledOnPool,
    event.params.scaledInP2P,
    RAY_UNITS
  );
}

export function handleSupplied(event: Supplied): void {
  const marketAddress = event.params.underlying;
  const userAddress = event.params.onBehalf;
  handleSuppliedInternal(
    event,
    marketAddress,
    userAddress,
    event.params.scaledOnPool,
    event.params.scaledInP2P,
    RAY_UNITS
  );
}

export function handleWithdrawn(event: Withdrawn): void {
  const marketAddress = event.params.underlying;
  const userAddress = event.params.onBehalf;
  handleWithdrawnInternal(
    event,
    marketAddress,
    userAddress,
    event.params.scaledOnPool,
    event.params.scaledInP2P,
    RAY_UNITS
  );
}

export function handleBorrowPositionUpdated(event: BorrowPositionUpdated): void {
  handleBorrowerPositionUpdatedInternal(
    event,
    event.params.underlying,
    event.params.user,
    event.params.scaledOnPool,
    event.params.scaledInP2P,
    RAY_UNITS
  );
}
export function handleSupplierPositionUpdated(event: SupplyPositionUpdated): void {
  handleSupplierPositionUpdatedInternal(
    event,
    event.params.underlying,
    event.params.user,
    event.params.scaledOnPool,
    event.params.scaledInP2P,
    RAY_UNITS
  );
}
