import { Address, BigInt, log } from "@graphprotocol/graph-ts";

import { Morpho } from "../generated/Morpho/Morpho";

import { morphoAddress, startEpochBlockTimestamp } from "./config";
import { WAD, initialIndex, supplyEmissionsEpoch1, borrowEmissionsEpoch1 } from "./constants";
import { getOrInitMarket } from "./initializer";

const computeUpdatedMorphoIndex = (
  marketAddress: Address,
  blockTimestamp: BigInt,
  emissions: Map<string, BigInt>,
  lastMorphoIndex: BigInt,
  totalP2P: BigInt,
  totalOnPool: BigInt,
  lastP2PIndex: BigInt,
  lastPoolIndex: BigInt,
  lastUpdateBlockTimestamp: BigInt
): BigInt => {
  if (blockTimestamp.le(startEpochBlockTimestamp)) return initialIndex;

  const totalP2PUnderlying = totalP2P.times(lastP2PIndex).div(WAD);
  const totalOnPoolUnderlying = totalOnPool.times(lastPoolIndex).div(WAD);
  const totalUnderlying = totalOnPoolUnderlying.plus(totalP2PUnderlying);

  let speed = BigInt.zero();
  if (emissions.has(marketAddress.toHexString())) {
    speed = emissions.get(marketAddress.toHexString());
  }
  log.debug("Supply speed for market {}: {}", [marketAddress.toHexString(), speed.toHexString()]);

  const morphoAccrued = blockTimestamp.minus(lastUpdateBlockTimestamp).times(speed); // WAD
  if (morphoAccrued.le(BigInt.zero())) {
    log.error("negative token emission {}", [morphoAccrued.toString()]);
  }

  const emissionRatio = morphoAccrued.times(WAD).div(totalUnderlying); // 18 * 2 - decimals
  return lastMorphoIndex.plus(emissionRatio);
};

export function updateSupplyIndex(marketAddress: Address, blockTimestamp: BigInt, decimals: number): BigInt {
  const market = getOrInitMarket(marketAddress, blockTimestamp, decimals);
  if (market.supplyUpdateBlockTimestamp.equals(blockTimestamp)) return market.supplyIndex; // nothing to update

  const newMorphoSupplyIndex = computeUpdatedMorphoIndex(
    marketAddress,
    blockTimestamp,
    supplyEmissionsEpoch1,
    market.supplyIndex,
    market.totalSupplyP2P,
    market.totalSupplyOnPool,
    market.lastP2PSupplyIndex,
    market.lastPoolSupplyIndex,
    market.supplyUpdateBlockTimestamp
  );

  const morpho = Morpho.bind(morphoAddress);
  market.supplyIndex = newMorphoSupplyIndex;
  market.supplyUpdateBlockTimestamp = blockTimestamp;
  market.lastPoolSupplyIndex = morpho.lastPoolIndexes(marketAddress).value1;
  market.lastP2PSupplyIndex = morpho.p2pSupplyIndex(marketAddress);
  market.save();

  return newMorphoSupplyIndex;
}

export function updateBorrowIndex(marketAddress: Address, blockTimestamp: BigInt, decimals: number): BigInt {
  const market = getOrInitMarket(marketAddress, blockTimestamp, decimals);
  if (market.borrowUpdateBlockTimestamp.ge(blockTimestamp)) return market.borrowIndex;

  const newMorphoBorrowIndex = computeUpdatedMorphoIndex(
    marketAddress,
    blockTimestamp,
    borrowEmissionsEpoch1,
    market.supplyIndex,
    market.totalBorrowP2P,
    market.totalBorrowOnPool,
    market.lastP2PBorrowIndex,
    market.lastPoolBorrowIndex,
    market.borrowUpdateBlockTimestamp
  );

  const morpho = Morpho.bind(morphoAddress);
  market.borrowIndex = newMorphoBorrowIndex;
  market.borrowUpdateBlockTimestamp = blockTimestamp;
  market.lastPoolBorrowIndex = morpho.lastPoolIndexes(marketAddress).value2;
  market.lastP2PBorrowIndex = morpho.p2pBorrowIndex(marketAddress);
  market.save();

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
