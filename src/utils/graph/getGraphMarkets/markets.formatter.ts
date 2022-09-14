import { BigNumber } from "ethers";
import { WAD } from "../../../helpers/constants";
import { GraphMarketConfiguration } from "./markets.types";

export const graphToMarketConfig = (graphMarket: GraphMarketConfiguration) => ({
  address: graphMarket.address,
  price: BigNumber.from(graphMarket.reserveData.usd),
  totalSupply: BigNumber.from(graphMarket.metrics.totalSupplyOnPool)
    .mul(graphMarket.reserveData.supplyPoolIndex)
    .div(WAD),
  totalBorrow: BigNumber.from(graphMarket.metrics.totalBorrowOnPool),
  p2pIndexCursor: BigNumber.from(graphMarket.p2pIndexCursor),
});
