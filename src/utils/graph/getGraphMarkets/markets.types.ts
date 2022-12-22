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
  borrowIndex: BigNumber;
  supplyUpdateBlockTimestamp: BigNumber;
  borrowUpdateBlockTimestamp: BigNumber;
  lastP2PBorrowIndex: BigNumber;
  lastPoolBorrowIndex: BigNumber;
  lastP2PSupplyIndex: BigNumber;
  lastPoolSupplyIndex: BigNumber;
  lastTotalBorrow: BigNumber;
  lastTotalSupply: BigNumber;
}
export interface MarketMinimal {
  address: string;
  price: BigNumber;
  totalSupply: BigNumber;
  totalBorrow: BigNumber;
  p2pIndexCursor: BigNumber;
  totalMorphoSupply: BigNumber;
  totalMorphoBorrow: BigNumber;
}
