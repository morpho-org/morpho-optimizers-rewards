import { BigNumber } from "ethers";

export interface MultiplicatorPerMarkets {
  [markets: string]: { supply: BigNumber; borrow: BigNumber };
}
export interface UserMultiplicators {
  [user: string]: MultiplicatorPerMarkets;
}
