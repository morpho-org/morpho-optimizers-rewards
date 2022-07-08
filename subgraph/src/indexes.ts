import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { morphoAddress, startEpochBlockTimestamp } from "./config";
import { initialIndex, WAD } from "./constants";
import { getOrInitMarket } from "./initializer";
import { Morpho } from "../generated/Morpho/Morpho";
import { getBorrowEmissions, getSupplyEmissions } from "./emissions";

export function updateSupplyIndex(marketAddress: Address, blockTimestamp: BigInt, decimals: number): BigInt {
  const market = getOrInitMarket(marketAddress, blockTimestamp, decimals);
  if (market.supplyUpdateBlockTimestamp.equals(blockTimestamp)) return market.supplyIndex; // nothing to update

  let newMorphoSupplyIndex: BigInt;
  if (blockTimestamp.le(startEpochBlockTimestamp)) newMorphoSupplyIndex = initialIndex(decimals);
  else {
    const totalP2PSupply = market.totalSupplyP2P.times(market.lastP2PSupplyIndex).div(WAD());
    const totalPoolSupply = market.totalSupplyOnPool.times(market.lastPoolSupplyIndex).div(WAD());
    const totalSupply = totalPoolSupply.plus(totalP2PSupply); // total supply since last update
    const supplyEmissions = getSupplyEmissions();
    let speed = BigInt.zero();
    if (supplyEmissions.has(marketAddress.toHexString())) {
      speed = supplyEmissions.get(marketAddress.toHexString());
    }
    log.debug("Supply speed for market {}: {}", [marketAddress.toHexString(), speed.toHexString()]);
    const morphoAccrued = blockTimestamp.minus(market.supplyUpdateBlockTimestamp).times(speed); // WAD
    if (morphoAccrued.le(BigInt.zero())) {
      log.error("negative token emission {}", [morphoAccrued.toString()]);
    }
    const ratio = morphoAccrued.times(BigInt.fromI32(10).pow(18 as u8)).div(totalSupply); // 18 * 2 - decimals
    newMorphoSupplyIndex = ratio.plus(market.supplyIndex);
  }
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
  let newMorphoBorrowIndex: BigInt;
  if (blockTimestamp.le(startEpochBlockTimestamp)) newMorphoBorrowIndex = initialIndex(decimals);
  else {
    const totalP2PBorrow = market.totalBorrowP2P.times(market.lastP2PBorrowIndex).div(WAD()); // in underlying
    const totalPoolBorrow = market.totalBorrowOnPool.times(market.lastPoolBorrowIndex).div(WAD()); // in underlying
    const totalBorrowUnderlying = totalP2PBorrow.plus(totalPoolBorrow); // never equals to zero after the beginning of the epoch
    // this assertion becomes false if we add a market during the epoch.
    const borrowEmissions = getBorrowEmissions();
    let speed = BigInt.zero();
    if (borrowEmissions.has(marketAddress.toHexString())) {
      speed = borrowEmissions.get(marketAddress.toHexString());
    }
    log.warning("Borrow speed for market {}: {}", [marketAddress.toHexString(), speed.toHexString()]);
    const morphoAccrued = blockTimestamp.minus(market.borrowUpdateBlockTimestamp).times(speed);
    const ratio = morphoAccrued.times(BigInt.fromI32(10).pow(18 as u8)).div(totalBorrowUnderlying);
    newMorphoBorrowIndex = market.borrowIndex.plus(ratio);
  }
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
  return userBalance.times(marketIndex.minus(userIndex)).div(BigInt.fromI32(10).pow(18 as u8));
}
