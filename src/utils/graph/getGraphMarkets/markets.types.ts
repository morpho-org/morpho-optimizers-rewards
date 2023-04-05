import { BigNumber } from "ethers";

export interface GraphMarketConfiguration {
  address: string;
  symbol: string;
  p2pIndexCursor: string;
  reserveData: {
    usd: string;
    supplyPoolIndex: string;
    borrowPoolIndex: string;
  };
  metrics: {
    totalBorrowOnPool: string;
    totalSupplyOnPool: string;
    borrowBalanceInP2P: string;
    borrowBalanceOnPool: string;
    supplyBalanceInP2P: string;
    supplyBalanceOnPool: string;
  };
  p2pData: {
    p2pSupplyIndex: string;
    p2pBorrowIndex: string;
  };
}
export interface Market {
  address: string;
  supplyIndex: BigNumber;
  poolSupplyIndex: BigNumber;
  p2pSupplyIndex: BigNumber;
  supplyUpdateBlockTimestamp: BigNumber;
  supplyUpdateBlockTimestampV1: BigNumber;

  borrowIndex: BigNumber;
  poolBorrowIndex: BigNumber;
  p2pBorrowIndex: BigNumber;
  borrowUpdateBlockTimestamp: BigNumber;
  borrowUpdateBlockTimestampV1: BigNumber;

  lastPoolSupplyIndex: BigNumber;
  lastP2PSupplyIndex: BigNumber;
  lastPoolBorrowIndex: BigNumber;
  lastP2PBorrowIndex: BigNumber;
  lastTotalSupply: BigNumber;
  lastTotalBorrow: BigNumber;

  scaledSupplyOnPool: BigNumber;
  scaledSupplyInP2P: BigNumber;
  scaledBorrowOnPool: BigNumber;
  scaledBorrowInP2P: BigNumber;
}
export interface MarketMinimal {
  address: string;
  price: BigNumber;
  totalPoolSupplyUSD: BigNumber;
  totalPoolBorrowUSD: BigNumber;
  p2pIndexCursor: BigNumber;
  morphoSupplyMarketSize: BigNumber;
  morphoBorrowMarketSize: BigNumber;

  decimals: number;
}
