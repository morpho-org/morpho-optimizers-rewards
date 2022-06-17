import { Address, BigInt } from "@graphprotocol/graph-ts";
import { morphoAddresString, startEpochBlockNumber } from "./config";
import { initialIndex, WAD } from "./constants";
import { getOrIniBalance, getOrInitMarket } from "./initializer";
import { Morpho } from "../generated/Morpho/Morpho";
import { CToken } from "../generated/Morpho/CToken";

export function updateSupplyIndex(marketAddress: Address, blockNumber: BigInt): BigInt {
    if(blockNumber.le(startEpochBlockNumber)) return initialIndex();
    const market = getOrInitMarket(marketAddress);
    if(market.supplyUpdateBlockNumber.equals(blockNumber)) return market.supplyIndex;
    const morpho = Morpho.bind(Address.fromString(morphoAddresString));
    const cToken = CToken.bind(marketAddress);
    const delta = morpho.deltas(marketAddress);
    const totalP2PSupply = delta.value2.times(morpho.p2pSupplyIndex(marketAddress)).div(WAD());
    const totalPoolSupply = cToken.balanceOfUnderlying(Address.fromString(morphoAddresString));
    const totalSupplyUnderlying = totalP2PSupply.plus(totalPoolSupply);
    const speed = BigInt.zero();
    const morphoAccrued = blockNumber.minus(market.supplyUpdateBlockNumber).times(speed);
    const ratio = morphoAccrued.times(BigInt.fromI32(10).pow(36 as u8)).div(totalSupplyUnderlying);
    const newMorphoSupplyIndex = market.supplyIndex.plus(ratio);
    market.supplyIndex = newMorphoSupplyIndex;
    market.supplyUpdateBlockNumber = blockNumber;
    market.save();
    return newMorphoSupplyIndex;
}

export function updateBorrowIndex(marketAddress: Address, blockNumber: BigInt): BigInt {
    if(blockNumber.le(startEpochBlockNumber)) return initialIndex();
    const market = getOrInitMarket(marketAddress);
    if(market.borrowIndexBlockNumber.ge(blockNumber)) return market.borrowIndex;
    const morpho = Morpho.bind(Address.fromString(morphoAddresString));
    const cToken = CToken.bind(marketAddress);
    const delta = morpho.deltas(marketAddress);
    const totalP2PBorrow = delta.value2.times(morpho.p2pSupplyIndex(marketAddress)).div(WAD());
    const totalPoolBorrow = cToken.borrowBalanceStored(Address.fromString(morphoAddresString));
    const totalBorrowUnderlying = totalP2PBorrow.plus(totalPoolBorrow);
    const speed = BigInt.zero();
    const morphoAccrued = blockNumber.minus(market.borrowIndexBlockNumber).times(speed);
    const ratio = morphoAccrued.times(BigInt.fromI32(10).pow(36 as u8)).div(totalBorrowUnderlying);
    const newMorphoBorrowIndex = market.borrowIndex.plus(ratio);
    market.supplyIndex = newMorphoBorrowIndex;
    market.supplyUpdateBlockNumber = blockNumber;
    market.save();
    return newMorphoBorrowIndex;
}

export function accrueBorrowerMorpho(user: Address, marketAddress: Address, prevBalance: BigInt, newIndex: BigInt): BigInt {
    const balance = getOrIniBalance(user, marketAddress);
    return prevBalance.times(newIndex.minus(balance.userBorrowIndex)).div(BigInt.fromI32(10).pow(36 as u8));
}
export function accrueSupplierMorpho(user: Address, marketAddress: Address, prevBalance: BigInt, newIndex: BigInt): BigInt {
    const balance = getOrIniBalance(user, marketAddress);
    return prevBalance.times(newIndex.minus(balance.userSupplyIndex)).div(BigInt.fromI32(10).pow(36 as u8));
}
