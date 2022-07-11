import { Address, BigInt, log } from "@graphprotocol/graph-ts";

import { startEpochBlockTimestamp } from "./config";
import { WAD, initialIndex, supplyEmissionsEpoch1, borrowEmissionsEpoch1 } from "./constants";
import { getOrInitMarket } from "./initializer";

const computeUpdatedMorphoIndex = (
  marketAddress: Address,
  blockTimestamp: BigInt,
  emissions: Map<string, BigInt>,
  lastMorphoIndex: BigInt,
  lastUpdateBlockTimestamp: BigInt,
  lastTotalUnderlying: BigInt,
  marketSide: string
): BigInt => {
  if (blockTimestamp.le(startEpochBlockTimestamp)) return initialIndex;

  let speed = BigInt.zero();
  if (emissions.has(marketAddress.toHexString())) {
    speed = emissions.get(marketAddress.toHexString());
  }
  log.debug("$MORPHO {} speed for market {}: {}", [marketSide, marketAddress.toHexString(), speed.toHexString()]);

  const morphoAccrued = blockTimestamp.minus(lastUpdateBlockTimestamp).times(speed); // WAD
  if (morphoAccrued.le(BigInt.zero())) {
    log.error("negative token emission {}", [morphoAccrued.toString()]);
  }

  const accrualIndex = morphoAccrued.times(WAD).div(lastTotalUnderlying); // 18 * 2 - decimals
  return lastMorphoIndex.plus(accrualIndex);
};

export function updateSupplyIndex(marketAddress: Address, blockTimestamp: BigInt): BigInt {
  const market = getOrInitMarket(marketAddress, blockTimestamp);
  if (market.supplyUpdateBlockTimestamp.equals(blockTimestamp)) return market.supplyIndex; // nothing to update

  const newMorphoSupplyIndex = computeUpdatedMorphoIndex(
    marketAddress,
    blockTimestamp,
    supplyEmissionsEpoch1,
    market.supplyIndex,
    market.supplyUpdateBlockTimestamp,
    market.lastTotalSupply,
    "Supply"
  );

  return newMorphoSupplyIndex;
}

export function updateBorrowIndex(marketAddress: Address, blockTimestamp: BigInt): BigInt {
  const market = getOrInitMarket(marketAddress, blockTimestamp);
  if (market.borrowUpdateBlockTimestamp.ge(blockTimestamp)) return market.borrowIndex;

  const newMorphoBorrowIndex = computeUpdatedMorphoIndex(
    marketAddress,
    blockTimestamp,
    borrowEmissionsEpoch1,
    market.borrowIndex,
    market.borrowUpdateBlockTimestamp,
    market.lastTotalBorrow,
    "Borrow"
  );

  return newMorphoBorrowIndex;
}

export function accrueMorphoTokens(marketIndex: BigInt, userIndex: BigInt, userBalance: BigInt): BigInt {
  if (marketIndex.minus(userIndex).lt(BigInt.zero())) {
    log.error("Inconsistent index computation. User index: {}, market index: {}, substraction: {}", [
      userIndex.toString(),
      marketIndex.toString(),
      marketIndex.minus(userIndex).toString(),
    ]);

    return BigInt.zero();
  }

  return userBalance.times(marketIndex.minus(userIndex)).div(WAD);
}
