import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";

import {
  epochIdToEndTimestamp,
  epochIdToStartTimestamp,
  fetchDistribution,
  fetchDistributionFromDistributionId,
  ipfsJson,
  timestampToEpochId,
} from "./distributions";
import { getOrInitMarket, getOrInitMarketEpoch } from "./initializer";
import { WAD } from "./constants";

/**
 * The emission between timestamp from and timestamp to is linear, and the two timestamps has
 * to be in the same epoch
 */
const computeOneEpochDistribuedRewards = (
  timestampFrom: BigInt,
  timestampTo: BigInt,
  totalSupply: BigInt,
  speed: BigInt
): BigInt => {
  if (speed.isZero()) return BigInt.zero();
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
  const obj = ipfsJson();
  // sync eventual previous epoch
  const prevEpochId = timestampToEpochId(obj, lastUpdateBlockTimestamp);
  const currentEpochId = timestampToEpochId(obj, blockTimestamp);
  if (!currentEpochId) return lastMorphoIndex; // TODO: to move at the end

  if (!prevEpochId && currentEpochId) {
    // start of the first epoch
    const start = epochIdToStartTimestamp(obj, currentEpochId);
    if (!start) {
      log.critical("No start timestamp for epoch {}", [currentEpochId as string]);
      return BigInt.zero();
    }
    const accrualIndex = computeOneEpochDistribuedRewards(
      start,
      blockTimestamp,
      lastTotalUnderlying,
      fetchDistribution(obj, blockTimestamp, marketSide, marketAddress)
    );
    return lastMorphoIndex.plus(accrualIndex);
  }
  if (
    prevEpochId &&
    currentEpochId &&
    // string comparison is not working when compiled with WASM, we have to pass through bytes comparison
    !Bytes.fromUTF8(prevEpochId.toString()).equals(Bytes.fromUTF8(currentEpochId.toString()))
  ) {
    // need to tackle multiple speeds
    log.warning("Prev epoch: {}, current epoch: {}", [prevEpochId, currentEpochId as string]);
    const end = epochIdToEndTimestamp(obj, prevEpochId);

    if (!end) {
      log.critical("No end timestamp for epoch {}", [prevEpochId]);
      return BigInt.zero();
    }
    lastMorphoIndex = lastMorphoIndex.plus(
      computeOneEpochDistribuedRewards(
        lastUpdateBlockTimestamp,
        end,
        lastTotalUnderlying,
        fetchDistributionFromDistributionId(obj, prevEpochId + "-" + marketSide + "-" + marketAddress.toHexString())
      )
    );
    const snapshot = getOrInitMarketEpoch(marketAddress, prevEpochId, marketSide, end);
    snapshot.index = lastMorphoIndex;
    snapshot.timestamp = end;
    snapshot.isFinished = true;
    snapshot.save();
    const startTimestamp = epochIdToStartTimestamp(obj, currentEpochId as string);

    if (!startTimestamp) {
      log.critical("No start timestamp for epoch {}", [currentEpochId as string]);
      return BigInt.zero();
    }
    lastUpdateBlockTimestamp = startTimestamp;
    if (startTimestamp.ge(blockTimestamp)) return lastMorphoIndex;
    // stop the distribution if it is the beginning of the current epoch, else start distribution
  }
  const id = ((currentEpochId as string) + "-" + marketSide + "-" + marketAddress.toHexString()) as string;
  const accrualIndex = computeOneEpochDistribuedRewards(
    lastUpdateBlockTimestamp,
    blockTimestamp,
    lastTotalUnderlying,
    fetchDistributionFromDistributionId(obj, id)
  );
  const newIndex = lastMorphoIndex.plus(accrualIndex);

  const snapshot = getOrInitMarketEpoch(marketAddress, currentEpochId as string, marketSide, blockTimestamp);
  snapshot.index = newIndex;
  snapshot.timestamp = blockTimestamp;
  snapshot.save();

  return newIndex;
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
