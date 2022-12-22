import { BigNumber } from "ethers";

export interface MarketEmission {
  supply: BigNumber;
  supplyRate: BigNumber;
  borrow: BigNumber;
  borrowRate: BigNumber;
  p2pIndexCursor: BigNumber;
  marketEmission: BigNumber;
  morphoSupply: BigNumber;
  morphoBorrow: BigNumber;
}
