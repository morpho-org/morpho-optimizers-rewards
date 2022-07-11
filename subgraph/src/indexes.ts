import { Address, BigInt, log } from "@graphprotocol/graph-ts";

import { startEpochBlockTimestamp } from "./config";
import { borrowEmissionsEpoch1, initialIndex, supplyEmissionsEpoch1, WAD } from "./constants";
import { getOrInitMarket } from "./initializer";
import { maxBN } from "./helpers";

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
  if (emissions.has(marketAddress.toHexString())) speed = emissions.get(marketAddress.toHexString());
  else {
    log.critical("No emission speed found for market {}", [marketAddress.toHexString()]);

    return lastMorphoIndex;
  }

  log.debug("$MORPHO {} speed for market {}: {}", [marketSide, marketAddress.toHexString(), speed.toHexString()]);

  const startTimestamp = maxBN(startEpochBlockTimestamp, lastUpdateBlockTimestamp);
  const morphoAccrued = blockTimestamp.minus(startTimestamp).times(speed); // WAD
  if (morphoAccrued.lt(BigInt.zero())) log.critical("negative token emission {}", [morphoAccrued.toString()]);

  const accrualIndex = morphoAccrued.times(WAD).div(lastTotalUnderlying); // 18 * 2 - decimals
  return lastMorphoIndex.plus(accrualIndex);
};

export function updateSupplyIndex(marketAddress: Address, blockTimestamp: BigInt): BigInt {
  const market = getOrInitMarket(marketAddress, blockTimestamp);
  if (market.supplyUpdateBlockTimestamp.equals(blockTimestamp)) return market.supplyIndex; // nothing to update

  return computeUpdatedMorphoIndex(
    marketAddress,
    blockTimestamp,
    supplyEmissionsEpoch1,
    market.supplyIndex,
    market.supplyUpdateBlockTimestamp,
    market.lastTotalSupply,
    "Supply"
  );
}

export function updateBorrowIndex(marketAddress: Address, blockTimestamp: BigInt): BigInt {
  const market = getOrInitMarket(marketAddress, blockTimestamp);
  if (market.borrowUpdateBlockTimestamp.ge(blockTimestamp)) return market.borrowIndex;

  return computeUpdatedMorphoIndex(
    marketAddress,
    blockTimestamp,
    borrowEmissionsEpoch1,
    market.borrowIndex,
    market.borrowUpdateBlockTimestamp,
    market.lastTotalBorrow,
    "Borrow"
  );
}

export function accrueMorphoTokens(marketIndex: BigInt, userIndex: BigInt, userBalance: BigInt): BigInt {
  if (marketIndex.minus(userIndex).lt(BigInt.zero())) {
    log.critical("Inconsistent index computation. User index: {}, market index: {}, substraction: {}", [
      userIndex.toString(),
      marketIndex.toString(),
      marketIndex.minus(userIndex).toString(),
    ]);
  }

  return userBalance.times(marketIndex.minus(userIndex)).div(WAD);
}
