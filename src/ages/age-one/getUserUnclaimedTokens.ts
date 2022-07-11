import { now } from "../../helpers/time";
import configuration from "./configuration";
import { BigNumber } from "ethers";
import axios from "axios";
import { WAD } from "../../helpers/constants";
import marketsEmission from "../../../ages/age1/epoch1/marketsEmission.json";
import { GraphUserBalances, Market, UserBalance } from "../../subgraph/types";
import { formatGraphBalances } from "../../subgraph/graphBalances.formater";

// only for epoch one for now
export const getUserUnclaimedTokensFromDistribution = async (address: string) => {
  const endDate = BigNumber.from(Math.min(configuration.epochs.epoch1.finalTimestamp.toNumber(), now()));
  const userBalances = await getUserBalances(address);
  return userBalancesToUnclaimedTokens(userBalances.balances, endDate);
};
export const userBalancesToUnclaimedTokens = (balances: UserBalance[], endDate: BigNumber) =>
  balances
    .map((b) => {
      let unclaimed = b.unclaimedMorpho;
      const supplyIndex = computeSupplyIndex(b.market, endDate);
      unclaimed = unclaimed.add(getUserUnclaimedTokens(supplyIndex, b.userSupplyIndex, b.underlyingSupplyBalance));
      const borrowIndex = computeBorrowIndex(b.market, endDate);
      unclaimed = unclaimed.add(getUserUnclaimedTokens(borrowIndex, b.userBorrowIndex, b.underlyingBorrowBalance));
      return unclaimed;
    })
    .reduce((a, b) => a.add(b), BigNumber.from(0));

const getUserUnclaimedTokens = (marketIndex: BigNumber, userIndex: BigNumber, userBalance: BigNumber) => {
  if (userIndex.gt(marketIndex)) return BigNumber.from(0);
  return marketIndex.sub(userIndex).mul(userBalance).div(WAD); // with 18 decimals
};
const computeSupplyIndex = (market: Market, currentTimestamp: BigNumber) => {
  const deltaTimestamp = currentTimestamp.sub(market.supplyUpdateBlockTimestamp);
  if (deltaTimestamp.lte(0)) return market.supplyIndex;

  // @ts-ignore
  const supplySpeed = BigNumber.from(marketsEmission.markets[market.address].supplyRate);
  const morphoAccrued = deltaTimestamp.mul(supplySpeed); // in WEI units;
  const ratio = morphoAccrued.mul(WAD).div(market.lastTotalSupply); // in 18*2 - decimals units;
  return market.supplyIndex.add(ratio);
};
const computeBorrowIndex = (market: Market, currentTimestamp: BigNumber) => {
  const deltaTimestamp = currentTimestamp.sub(market.borrowUpdateBlockTimestamp);
  if (deltaTimestamp.lte(0)) return market.borrowIndex;
  // @ts-ignore
  const borrowSpeed = BigNumber.from(marketsEmission.markets[market.address].borrowRate);
  const morphoAccrued = deltaTimestamp.mul(borrowSpeed); // in WEI units;
  const ratio = morphoAccrued.mul(WAD).div(market.lastTotalBorrow); // in 18*2 - decimals units;
  return market.borrowIndex.add(ratio);
};

export const getUserBalances = async (user: string) =>
  axios
    .post<{ query: string; variables: { user: string } }, { data: { data: { user: GraphUserBalances } } }>(graphUrl, {
      query,
      variables: { user },
    })
    .then((r) => formatGraphBalances(r.data.data.user));

const graphUrl = configuration.epochs.epoch1.subgraphUrl;
const query = `query GetUserBalances($user: ID!){
  user(id: $user) {
    address
    balances {
      timestamp
      underlyingSupplyBalance
      underlyingBorrowBalance
      userSupplyIndex
      userBorrowIndex
      unclaimedMorpho
      market {
        address
        supplyIndex
        borrowIndex
        supplyUpdateBlockTimestamp
        borrowUpdateBlockTimestamp
        lastP2PBorrowIndex
        lastPoolBorrowIndex
        lastP2PSupplyIndex
        lastPoolSupplyIndex
        lastTotalSupply
        lastTotalBorrow
      }
    }
  }
}`;
