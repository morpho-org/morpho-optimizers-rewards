import { BigNumber } from "ethers";
import { GraphMarketConfiguration, MarketMinimal } from "./markets.types";
import { CompoundMath } from "@morpho-labs/ethers-utils/lib/maths";

export const graphToMarketConfig = (graphMarket: GraphMarketConfiguration): MarketMinimal => ({
  address: graphMarket.address,
  price: BigNumber.from(graphMarket.reserveData.usd),
  totalPoolSupplyUSD: CompoundMath.mul(graphMarket.metrics.totalSupplyOnPool, graphMarket.reserveData.supplyPoolIndex),
  totalPoolBorrowUSD: BigNumber.from(graphMarket.metrics.totalBorrowOnPool),
  p2pIndexCursor: BigNumber.from(graphMarket.p2pIndexCursor),
  morphoSupplyMarketSize: CompoundMath.mul(
    graphMarket.metrics.supplyBalanceInP2P,
    graphMarket.p2pData.p2pSupplyIndex
  ).add(CompoundMath.mul(graphMarket.metrics.supplyBalanceOnPool, graphMarket.reserveData.supplyPoolIndex)),
  morphoBorrowMarketSize: CompoundMath.mul(
    graphMarket.metrics.borrowBalanceInP2P,
    graphMarket.p2pData.p2pBorrowIndex
  ).add(CompoundMath.mul(graphMarket.metrics.borrowBalanceOnPool, graphMarket.reserveData.borrowPoolIndex)),
});
