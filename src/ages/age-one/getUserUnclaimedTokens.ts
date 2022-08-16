import { now } from "../../helpers/time";
import configuration from "./configuration";
import { BigNumber, providers } from "ethers";
import axios from "axios";
import { WAD } from "../../helpers/constants";
import { GraphUserBalances, Market, UserBalance } from "../../graph/types";
import { formatGraphBalances } from "../../graph/graphBalances.formater";
import { maxBN } from "../../helpers/maths";
const epochOneResult = require("../../../distribution/age1/epoch1/marketsEmission.json");
export const getUserUnclaimedTokensFromDistribution = async (
  address: string,
  epoch: keyof typeof configuration.epochs,
  blockNumber?: number,
) => {
  let endDate = BigNumber.from(Math.min(configuration.epochs[epoch].finalTimestamp.toNumber(), now()));
  if (blockNumber) {
    const provider = new providers.InfuraProvider(1);
    const block = await provider.getBlock(blockNumber);
    endDate = BigNumber.from(Math.min(configuration.epochs[epoch].finalTimestamp.toNumber(), block.timestamp));
  }
  const userBalances = await getUserBalances(
    configuration.epochs[epoch].subgraphUrl,
    address.toLowerCase(),
    blockNumber,
  );

  return userBalancesToUnclaimedTokens(address, userBalances?.balances || [], endDate, epoch);
};
export const userBalancesToUnclaimedTokens = (
  userAddress: string,
  balances: UserBalance[],
  endDate: BigNumber,
  epoch: keyof typeof configuration.epochs,
) => {
  let prevEpochRewards = BigNumber.from(0);

  // add the previous epoch rewards to sum rewards for root computation
  if (epoch === "epoch2") {
    const strRewards = epochOneResult.distribution.find(
      (d: { accumulatedRewards: string; address: string }) => d.address.toLowerCase() === userAddress.toLowerCase(),
    )?.accumulatedRewards;
    if (strRewards) {
      prevEpochRewards = BigNumber.from(strRewards);
    }
  }
  return balances
    .map((b) => {
      let unclaimed = b.accumulatedMorpho;

      const supplyIndex = computeSupplyIndex(b.market, endDate, configuration.epochs[epoch].initialTimestamp, epoch);
      unclaimed = unclaimed.add(getUserUnclaimedTokens(supplyIndex, b.userSupplyIndex, b.underlyingSupplyBalance));
      const borrowIndex = computeBorrowIndex(b.market, endDate, configuration.epochs[epoch].initialTimestamp, epoch);
      unclaimed = unclaimed.add(getUserUnclaimedTokens(borrowIndex, b.userBorrowIndex, b.underlyingBorrowBalance));
      return unclaimed;
    })
    .reduce((a, b) => a.add(b), BigNumber.from(0))
    .add(prevEpochRewards);
};

const getUserUnclaimedTokens = (marketIndex: BigNumber, userIndex: BigNumber, userBalance: BigNumber) => {
  if (userIndex.gt(marketIndex)) return BigNumber.from(0);
  return marketIndex.sub(userIndex).mul(userBalance).div(WAD); // with 18 decimals
};
const computeSupplyIndex = (
  market: Market,
  currentTimestamp: BigNumber,
  startEpochTimestamp: BigNumber,
  epoch: keyof typeof configuration.epochs,
) => {
  const startTimestamp = maxBN(startEpochTimestamp, market.supplyUpdateBlockTimestamp);
  const deltaTimestamp = currentTimestamp.sub(startTimestamp);
  if (deltaTimestamp.lte(0)) return market.supplyIndex;

  // @ts-ignore
  const marketsEmission = require(`../../../distribution/age1/${epoch}/marketsEmission.json`);
  const supplySpeed = BigNumber.from(marketsEmission.markets[market.address].supplyRate);
  const morphoAccrued = deltaTimestamp.mul(supplySpeed); // in WEI units;
  const ratio = morphoAccrued.mul(WAD).div(market.lastTotalSupply); // in 18*2 - decimals units;
  return market.supplyIndex.add(ratio);
};
const computeBorrowIndex = (
  market: Market,
  currentTimestamp: BigNumber,
  startEpochTimestamp: BigNumber,
  epoch: keyof typeof configuration.epochs,
) => {
  const startTimestamp = maxBN(startEpochTimestamp, market.borrowUpdateBlockTimestamp);
  const deltaTimestamp = currentTimestamp.sub(startTimestamp);
  if (deltaTimestamp.lte(0)) return market.borrowIndex;
  const marketsEmission = require(`../../../distribution/age1/${epoch}/marketsEmission.json`);
  const borrowSpeed = BigNumber.from(marketsEmission.markets[market.address].borrowRate);
  const morphoAccrued = deltaTimestamp.mul(borrowSpeed); // in WEI units;
  const ratio = morphoAccrued.mul(WAD).div(market.lastTotalBorrow); // in 18*2 - decimals units;
  return market.borrowIndex.add(ratio);
};

export const getUserBalances = async (graphUrl: string, user: string, block?: number) =>
  axios
    .post<
      { query: string; variables: { user: string } },
      { data: { data?: { user?: GraphUserBalances }; errors?: any } }
    >(graphUrl, {
      query: block ? queryWithBlock : query,
      variables: { user, block },
    })
    .then((r) => {
      if (!r.data?.data) throw Error(JSON.stringify(r.data.errors));
      if (!r.data.data.user) return undefined;
      return formatGraphBalances(r.data.data.user);
    });

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

const queryWithBlock = `query GetUserBalances($user: ID! $block: Int!){
  user(id: $user block: {number: $block}) {
    address
    balances {
      timestamp
      underlyingSupplyBalance
      underlyingBorrowBalance
      userSupplyIndex
      userBorrowIndex
      accumulatedMorpho
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
