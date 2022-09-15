import { BigNumber, BigNumberish, providers } from "ethers";
import axios from "axios";
import { maxBN, minBN, now, WAD } from "../helpers";
import { GraphUserBalances, UserBalance, formatGraphBalances } from "./graph";
import { Market } from "./graph/getGraphMarkets/markets.types";
import { getEpochsBetweenTimestamps, timestampToEpoch } from "./timestampToEpoch";
import { RewardsDistributor__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { ages } from "../ages";
export const getUserRewards = async (
  address: string,
  blockNumber?: number,
  provider: providers.Provider = new providers.InfuraProvider(1),
) => {
  let timestampEnd = now();
  if (blockNumber) {
    const block = await provider.getBlock(blockNumber);
    timestampEnd = block.timestamp;
  }
  const userBalances = await getUserBalances(
    ages["age1"].subgraphUrl, // TODO: export the subgraphUrl
    address.toLowerCase(),
    blockNumber,
  );
  const currentRewards = userBalancesToUnclaimedTokens(address, userBalances?.balances || [], timestampEnd);
  const claimableRaw = require("../../distribution/merkleTree/currentDistribution.json").proofs[address.toLowerCase()];
  const claimable = claimableRaw ? BigNumber.from(claimableRaw.amount) : BigNumber.from(0);
  const currentEpochRewards = currentRewards.sub(claimable);

  const currentEpoch = timestampToEpoch(timestampEnd);
  let currentEpochProjectedRewards = currentRewards;
  if (currentEpoch?.epoch.finalTimestamp)
    currentEpochProjectedRewards = userBalancesToUnclaimedTokens(
      address,
      userBalances?.balances || [],
      currentEpoch.epoch.finalTimestamp,
    ).sub(claimable);

  let claimed = BigNumber.from(0);
  let claimData = {};
  if (claimable.gt(0)) {
    const rewardsDisributor = RewardsDistributor__factory.connect(addresses.morphoDao.rewardsDistributor, provider);
    claimed = await rewardsDisributor.claimed(address);
    claimData = claimable.sub(claimed).gt(0)
      ? {
          rewardsDistributor: rewardsDisributor.address,
          functionSignature: "claim(address,uint256,bytes32[])",
          args: {
            address,
            amount: claimableRaw.amount,
            proof: claimableRaw.proof,
          },
          encodedData: await rewardsDisributor.populateTransaction
            .claim(address, claimableRaw.amount, claimableRaw.proof)
            .then((r) => r.data),
        }
      : {};
  }
  return {
    currentEpochRewards,
    currentEpochProjectedRewards,
    totalRewardsEarned: currentRewards,
    claimable,
    claimedRewards: claimed,
    claimData,
  };
};
export const userBalancesToUnclaimedTokens = (
  userAddress: string,
  balances: UserBalance[],
  currentTimestamp: BigNumberish,
) => {
  return balances
    .map((b) => {
      let accumulated = b.accumulatedMorpho;
      const supplyIndex = computeSupplyIndex(b.market, currentTimestamp);
      accumulated = accumulated.add(
        getUserAccumulatedRewards(supplyIndex, b.userSupplyIndex, b.underlyingSupplyBalance),
      );
      const borrowIndex = computeBorrowIndex(b.market, currentTimestamp);
      accumulated = accumulated.add(
        getUserAccumulatedRewards(borrowIndex, b.userBorrowIndex, b.underlyingBorrowBalance),
      );
      return accumulated;
    })
    .reduce((a, b) => a.add(b), BigNumber.from(0));
};

const getUserAccumulatedRewards = (marketIndex: BigNumber, userIndex: BigNumber, userBalance: BigNumber) => {
  if (userIndex.gt(marketIndex)) return BigNumber.from(0);
  return marketIndex.sub(userIndex).mul(userBalance).div(WAD); // with 18 decimals
};
const computeSupplyIndex = (market: Market, currentTimestamp: BigNumberish) =>
  computeIndex(
    market.address,
    market.supplyIndex,
    market.supplyUpdateBlockTimestamp,
    currentTimestamp,
    "supplyRate",
    market.lastTotalSupply,
  );
const computeBorrowIndex = (market: Market, currentTimestamp: BigNumberish) =>
  computeIndex(
    market.address,
    market.borrowIndex,
    market.borrowUpdateBlockTimestamp,
    currentTimestamp,
    "borrowRate",
    market.lastTotalBorrow,
  );

const computeIndex = (
  marketAddress: string,
  lastIndexIndex: BigNumber,
  lastUpdateTimestamp: BigNumberish,
  currentTimestamp: BigNumberish,
  rateType: "borrowRate" | "supplyRate",
  totalUnderlying: BigNumber,
) => {
  const epochs = getEpochsBetweenTimestamps(lastUpdateTimestamp, currentTimestamp);

  let index = lastIndexIndex;
  if (!epochs) return index;

  for (const epoch of epochs) {
    const initialTimestamp = maxBN(epoch.epoch.initialTimestamp, BigNumber.from(lastUpdateTimestamp));
    const finalTimestamp = minBN(epoch.epoch.finalTimestamp, BigNumber.from(currentTimestamp));
    const deltaTimestamp = finalTimestamp.sub(initialTimestamp);
    const marketsEmission = require(`../../distribution/${epoch.age}/${epoch.epoch.epochName}/marketsEmission.json`);
    const speed = BigNumber.from(marketsEmission.markets[marketAddress]?.[rateType] ?? 0);
    const morphoAccrued = deltaTimestamp.mul(speed); // in WEI units;
    const ratio = morphoAccrued.mul(WAD).div(totalUnderlying); // in 18*2 - decimals units;
    index = index.add(ratio);
  }
  return index;
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
