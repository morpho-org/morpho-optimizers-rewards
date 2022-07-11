import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { startEpochBlockTimestamp } from "./config";
import { initialIndex } from "./constants";
import { getOrInitMarket } from "./initializer";
import { getBorrowEmissions, getSupplyEmissions } from "./emissions";

export function updateSupplyIndex(marketAddress: Address, blockTimestamp: BigInt): BigInt {
  const market = getOrInitMarket(marketAddress, blockTimestamp);
  if (market.supplyUpdateBlockTimestamp.equals(blockTimestamp)) return market.supplyIndex; // nothing to update

  if (blockTimestamp.le(startEpochBlockTimestamp)) return initialIndex();
  else {
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
    const ratio = morphoAccrued.times(BigInt.fromI32(10).pow(18 as u8)).div(market.lastTotalSupply); // 18 * 2 - decimals
    return ratio.plus(market.supplyIndex);
  }
}

export function updateBorrowIndex(marketAddress: Address, blockTimestamp: BigInt): BigInt {
  const market = getOrInitMarket(marketAddress, blockTimestamp);
  if (market.borrowUpdateBlockTimestamp.ge(blockTimestamp)) return market.borrowIndex;
  if (blockTimestamp.le(startEpochBlockTimestamp)) return initialIndex();
  else {
    // this assertion becomes false if we add a market during the epoch.
    const borrowEmissions = getBorrowEmissions();
    let speed = BigInt.zero();
    if (borrowEmissions.has(marketAddress.toHexString())) {
      speed = borrowEmissions.get(marketAddress.toHexString());
    }
    log.warning("Borrow speed for market {}: {}", [marketAddress.toHexString(), speed.toHexString()]);
    const morphoAccrued = blockTimestamp.minus(market.borrowUpdateBlockTimestamp).times(speed);
    const ratio = morphoAccrued.times(BigInt.fromI32(10).pow(18 as u8)).div(market.lastTotalBorrow);
    return market.borrowIndex.plus(ratio);
  }
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
