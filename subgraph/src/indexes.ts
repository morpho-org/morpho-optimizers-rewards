import { Address, BigInt, log } from "@graphprotocol/graph-ts";

import { startEpochBlockTimestamp } from "./config";
import { emissions, initialIndex, WAD } from "./constants";
import { getOrInitMarket } from "./initializer";
import { getAgeAndEpoch } from "./constants/getAgeAndEpoch";
import { endTimestamps } from "./constants/endTimestamps";
import { startTimestamps } from "./constants/startTimestamps";

/**
 * The emission between timestamp from and timestamp to is linear, and the two timestamps has
 * to be in the same epoch
 */
const computeOneEpochDistribuedRewards = (
  marketAddress: Address,
  timestampFrom: BigInt,
  timestampTo: BigInt,
  totalSupply: BigInt,
  emissionId: string
): BigInt => {
  if (!emissions.has(emissionId)) log.critical("No emission defined for id {}", [emissionId]);
  const speeds = emissions.get(emissionId);
  if (!speeds.has(marketAddress.toHexString())) {
    // there is no rewards for this market
    log.info("No speed for {} on emission {}", [marketAddress.toHexString(), emissionId]);
    return BigInt.zero();
  }
  const speed = speeds.get(marketAddress.toHexString());
  log.debug("$MORPHO {} speed for market {}: {}", [emissionId, marketAddress.toHexString(), speed.toHexString()]);

  const morphoAccrued = timestampTo.minus(timestampFrom).times(speed); // WAD
  if (morphoAccrued.lt(BigInt.zero())) log.critical("negative token emission {}", [morphoAccrued.toString()]);

  return morphoAccrued.times(WAD).div(totalSupply); // 18 * 2 - decimals
};

const computeUpdatedMorphoIndex = (
  marketAddress: Address,
  blockTimestamp: BigInt,
  lastMorphoIndex: BigInt,
  lastUpdateBlockTimestamp: BigInt,
  lastTotalUnderlying: BigInt,
  marketSide: string
): BigInt => {
  if (blockTimestamp.le(startEpochBlockTimestamp)) return initialIndex;

  // sync eventual previous epoch
  const prevEpochId = getAgeAndEpoch(lastUpdateBlockTimestamp);
  const currentEpochId = getAgeAndEpoch(blockTimestamp);
  const emissionId = currentEpochId + "-" + marketSide;
  if (!currentEpochId) return lastMorphoIndex;
  if (!prevEpochId && currentEpochId) {
    // start of the first epoch
    if (!startTimestamps.has(currentEpochId)) log.critical("No start timestamp for epoch {}", [currentEpochId]);
    const accrualIndex = computeOneEpochDistribuedRewards(
      marketAddress,
      startTimestamps.get(currentEpochId),
      blockTimestamp,
      lastTotalUnderlying,
      emissionId
    );
    return lastMorphoIndex.plus(accrualIndex);
  }
  if (prevEpochId && prevEpochId !== currentEpochId) {
    // need to takle multiple speeds
    if (!endTimestamps.has(prevEpochId)) log.critical("No end timestamp for epoch {}", [prevEpochId]);
    const endTimestamp = endTimestamps.get(prevEpochId);
    lastMorphoIndex = lastMorphoIndex.plus(
      computeOneEpochDistribuedRewards(
        marketAddress,
        lastUpdateBlockTimestamp,
        endTimestamp,
        lastTotalUnderlying,
        emissionId
      )
    );
    if (!startTimestamps.has(currentEpochId as string)) {
      log.critical("No start timestamp for epoch {}", [currentEpochId as string]);
    }
    const startTimestamp = startTimestamps.get(currentEpochId as string);
    lastUpdateBlockTimestamp = startTimestamp;
    if (startTimestamp.ge(blockTimestamp)) return lastMorphoIndex;
    // stop the distribution if it is the beginning of the current epoch, else start distribution
  }
  const accrualIndex = computeOneEpochDistribuedRewards(
    marketAddress,
    lastUpdateBlockTimestamp,
    blockTimestamp,
    lastTotalUnderlying,
    emissionId
  );
  return lastMorphoIndex.plus(accrualIndex);
};

export function updateSupplyIndex(marketAddress: Address, blockTimestamp: BigInt): BigInt {
  const market = getOrInitMarket(marketAddress, blockTimestamp);
  if (market.supplyUpdateBlockTimestamp.equals(blockTimestamp)) return market.supplyIndex; // nothing to update

  return computeUpdatedMorphoIndex(
    marketAddress,
    blockTimestamp,
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
