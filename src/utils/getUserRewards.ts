import { BigNumber, BigNumberish, providers } from "ethers";
import { maxBN, minBN, now, WAD } from "../helpers";
import { GraphUserBalances, UserBalance, formatGraphBalances } from "./graph";
import { Market } from "./graph/getGraphMarkets/markets.types";
import { getEpochsBetweenTimestamps, getPrevEpoch, timestampToEpoch } from "./timestampToEpoch";
import { RewardsDistributor__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { ages } from "../ages";
import { getCurrentOnChainDistribution } from "./getCurrentOnChainDistribution";
import { getEpochMarketsDistribution } from "./getEpochMarketsDistribution";

export const getUserRewards = async (
  address: string,
  blockNumber?: number,
  provider: providers.Provider = new providers.InfuraProvider(1)
) => {
  let timestampEnd = now();
  if (blockNumber) {
    const block = await provider.getBlock(blockNumber);
    timestampEnd = block.timestamp;
  }
  const userBalances = await getUserBalances(
    ages[0].subgraphUrl, // TODO: export the subgraphUrl
    address.toLowerCase(),
    blockNumber
  );
  const currentEpoch = timestampToEpoch(timestampEnd);
  await getEpochMarketsDistribution(currentEpoch!.epoch.id, provider); // preload to cache the current epoch configuration
  // to prevent parallel fetching of the same data
  const currentRewards = await userBalancesToUnclaimedTokens(userBalances?.balances || [], timestampEnd, provider);
  const onChainDistribution = await getCurrentOnChainDistribution(provider, blockNumber);
  const claimableRaw = onChainDistribution.proofs[address.toLowerCase()];
  const claimable = claimableRaw ? BigNumber.from(claimableRaw.amount) : BigNumber.from(0);
  const prevEpoch = getPrevEpoch(currentEpoch?.epoch.id);
  let claimableSoon = BigNumber.from(0);
  if (prevEpoch && prevEpoch.epoch.id !== onChainDistribution.epoch) {
    // The previous epoch is done, but the root is not yet modified on chain
    // So The difference between the amùount of the previous epoch and the amount claimable on chain will be claimable soon,
    // When the root will be updated by DAO
    const prevId = prevEpoch.epoch.number;
    const prevDistribution = require(`../../distribution/proofs/proofs-${prevId}.json`);
    const claimableSoonRaw = prevDistribution.proofs[address.toLowerCase()];
    if (claimableSoonRaw) {
      claimableSoon = BigNumber.from(claimableSoonRaw.amount).sub(claimable);
    }
  }
  const currentEpochRewards = currentRewards.sub(claimable).sub(claimableSoon);

  let currentEpochProjectedRewards = currentRewards;
  if (currentEpoch?.epoch.finalTimestamp)
    currentEpochProjectedRewards = await userBalancesToUnclaimedTokens(
      userBalances?.balances || [],
      currentEpoch.epoch.finalTimestamp,
      provider
    ).then((r) => r.sub(claimable).sub(claimableSoon));

  let claimed = BigNumber.from(0);
  let claimData = {};
  if (claimable.gt(0)) {
    const rewardsDisributor = RewardsDistributor__factory.connect(addresses.morphoDao.rewardsDistributor, provider);
    claimed = await rewardsDisributor.claimed(address);
    claimData = claimable.sub(claimed).gt(0)
      ? {
          root: onChainDistribution.root,
          rewardsDistributor: rewardsDisributor.address,
          functionSignature: "claim(address,uint256,bytes32[])",
          args: {
            address,
            amount: claimableRaw!.amount,
            proof: claimableRaw!.proof,
          },
          encodedData: await rewardsDisributor.populateTransaction
            .claim(address, claimableRaw!.amount, claimableRaw!.proof)
            .then((r) => r.data),
        }
      : {};
  }
  return {
    currentEpochRewards,
    currentEpochProjectedRewards,
    totalRewardsEarned: currentRewards,
    claimable,
    claimableSoon,
    claimedRewards: claimed,
    claimData,
  };
};
export const userBalancesToUnclaimedTokens = async (
  balances: UserBalance[],
  currentTimestamp: BigNumberish,
  provider: providers.Provider
) => {
  return Promise.all(
    balances.map(async (b) => {
      let accumulated = b.accumulatedMorpho;
      const supplyIndex = await computeSupplyIndex(b.market, currentTimestamp, provider);
      accumulated = accumulated.add(
        getUserAccumulatedRewards(supplyIndex, b.userSupplyIndex, b.underlyingSupplyBalance)
      );
      const borrowIndex = await computeBorrowIndex(b.market, currentTimestamp, provider);
      accumulated = accumulated.add(
        getUserAccumulatedRewards(borrowIndex, b.userBorrowIndex, b.underlyingBorrowBalance)
      );
      return accumulated;
    })
  ).then((r) => r.reduce((a, b) => a.add(b), BigNumber.from(0)));
};

const getUserAccumulatedRewards = (marketIndex: BigNumber, userIndex: BigNumber, userBalance: BigNumber) => {
  if (userIndex.gt(marketIndex)) return BigNumber.from(0);
  return marketIndex.sub(userIndex).mul(userBalance).div(WAD); // with 18 decimals
};
const computeSupplyIndex = async (market: Market, currentTimestamp: BigNumberish, provider: providers.Provider) =>
  computeIndex(
    market.address,
    market.supplyIndex,
    market.supplyUpdateBlockTimestamp,
    currentTimestamp,
    "supplyRate",
    market.lastTotalSupply,
    provider
  );
const computeBorrowIndex = async (market: Market, currentTimestamp: BigNumberish, provider: providers.Provider) =>
  computeIndex(
    market.address,
    market.borrowIndex,
    market.borrowUpdateBlockTimestamp,
    currentTimestamp,
    "borrowRate",
    market.lastTotalBorrow,
    provider
  );

const computeIndex = async (
  marketAddress: string,
  lastIndex: BigNumber,
  lastUpdateTimestamp: BigNumberish,
  currentTimestamp: BigNumberish,
  rateType: "borrowRate" | "supplyRate",
  totalUnderlying: BigNumber,
  provider: providers.Provider
) => {
  const epochs = getEpochsBetweenTimestamps(lastUpdateTimestamp, currentTimestamp) ?? [];
  // we first compute distributionof each epoch,
  const distributions = Object.fromEntries(
    await Promise.all(
      epochs.map(async (epoch) => [epoch.epoch.id, await getEpochMarketsDistribution(epoch.epoch.id, provider)])
    )
  );
  return epochs.reduce((currentIndex, epoch) => {
    const initialTimestamp = maxBN(epoch.epoch.initialTimestamp, BigNumber.from(lastUpdateTimestamp));
    const finalTimestamp = minBN(epoch.epoch.finalTimestamp, BigNumber.from(currentTimestamp));
    const deltaTimestamp = finalTimestamp.sub(initialTimestamp);
    const marketsEmission = distributions[epoch.epoch.id];
    const speed = BigNumber.from(marketsEmission.markets[marketAddress]?.[rateType] ?? 0);
    const morphoAccrued = deltaTimestamp.mul(speed); // in WEI units;
    const ratio = totalUnderlying.eq(0) ? BigNumber.from(0) : morphoAccrued.mul(WAD).div(totalUnderlying); // in 18*2 - decimals units;
    return currentIndex.add(ratio);
  }, lastIndex);
};

export const getUserBalances = async (graphUrl: string, user: string, block?: number) => {
  const res = await fetch(graphUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: block ? queryWithBlock : query,
      variables: { user, block },
    }),
  });
  if (!res.ok) throw Error(res.status.toString());
  const data: QueryUserBalancesResponse = await res.json();
  if (!data?.data) throw Error(JSON.stringify(data.errors));
  if (!data.data.user) return undefined;
  return formatGraphBalances(data.data.user);
};

type QueryUserBalancesResponse = { data?: { user?: GraphUserBalances }; errors?: any };
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
