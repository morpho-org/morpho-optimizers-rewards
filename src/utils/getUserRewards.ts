import { BigNumber, BigNumberish, constants, providers } from "ethers";
import { maxBN, minBN, now, WAD } from "../helpers";
import { GraphUserBalances, UserBalance, formatGraphBalances } from "./graph";
import { Market } from "./graph/getGraphMarkets/markets.types";
import { getEpochsBetweenTimestamps, getPrevEpoch, timestampToEpoch } from "./timestampToEpoch";
import { RewardsDistributor__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { getCurrentOnChainDistribution } from "./getCurrentOnChainDistribution";
import { getEpochMarketsDistribution } from "./getEpochMarketsDistribution";
import { SUBGRAPH_URL } from "../config";
import balancesQuery from "./graph/getGraphBalances/balances.query";
import { PercentMath, WadRayMath } from "@morpho-labs/ethers-utils/lib/maths";

export const VERSION_2_TIMESTAMP = BigNumber.from(1675263600);

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
  const userBalances = await getUserBalances(SUBGRAPH_URL, address.toLowerCase(), blockNumber);
  const currentEpoch = timestampToEpoch(timestampEnd);
  await getEpochMarketsDistribution(currentEpoch!.epoch.id, provider); // preload to cache the current epoch configuration
  // to prevent parallel fetching of the same data
  const currentRewards = sumRewards(
    await userBalancesToUnclaimedTokens(userBalances?.balances || [], timestampEnd, provider)
  );
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
    currentEpochProjectedRewards = sumRewards(
      await userBalancesToUnclaimedTokens(userBalances?.balances || [], currentEpoch.epoch.finalTimestamp, provider)
    )
      .sub(claimable)
      .sub(claimableSoon);

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
      let accumulatedSupplyV1 = b.accumulatedSupplyMorphoV1;
      let accumulatedSupplyV2 = b.accumulatedSupplyMorphoV2;
      let accumulatedSupply = b.accumulatedSupplyMorpho;
      let accumulatedBorrowV1 = b.accumulatedBorrowMorphoV1;
      let accumulatedBorrowV2 = b.accumulatedBorrowMorphoV2;
      let accumulatedBorrow = b.accumulatedBorrowMorpho;
      if (
        b.market.supplyUpdateBlockTimestamp.lt(VERSION_2_TIMESTAMP) &&
        BigNumber.from(currentTimestamp).gte(VERSION_2_TIMESTAMP)
      ) {
        const supplyIndex = await computeSupplyIndex(b.market, VERSION_2_TIMESTAMP, provider);
        const { p2pSupplyIndex, poolSupplyIndex } = await computeSupplyIndexes(b.market, VERSION_2_TIMESTAMP, provider);
        const accruedSupplyV1 = getUserAccumulatedRewards(supplyIndex, b.userSupplyIndex, b.underlyingSupplyBalance);
        accumulatedSupplyV1 = accumulatedSupplyV1.add(accruedSupplyV1);
        accumulatedSupplyV2 = accumulatedSupplyV2.add(
          getUserAccumulatedRewards(p2pSupplyIndex, b.userSupplyInP2PIndex, b.scaledSupplyInP2P).add(
            getUserAccumulatedRewards(poolSupplyIndex, b.userSupplyOnPoolIndex, b.scaledSupplyOnPool)
          )
        );
        accumulatedSupply = accumulatedSupply.add(accruedSupplyV1);
        // update the market
        b.market.p2pSupplyIndex = p2pSupplyIndex;
        b.market.poolSupplyIndex = poolSupplyIndex;
        b.market.supplyIndex = supplyIndex;
        b.market.supplyUpdateBlockTimestamp = VERSION_2_TIMESTAMP;
        b.market.supplyUpdateBlockTimestampV1 = VERSION_2_TIMESTAMP;
        b.userSupplyOnPoolIndex = poolSupplyIndex;
        b.userSupplyInP2PIndex = p2pSupplyIndex;
        b.userSupplyIndex = supplyIndex;

        const borrowIndex = await computeBorrowIndex(b.market, VERSION_2_TIMESTAMP, provider);
        const { p2pBorrowIndex, poolBorrowIndex } = await computeBorrowIndexes(b.market, VERSION_2_TIMESTAMP, provider);
        const accruedBorrowV1 = getUserAccumulatedRewards(borrowIndex, b.userBorrowIndex, b.underlyingBorrowBalance);
        accumulatedBorrowV1 = accumulatedBorrowV1.add(accruedBorrowV1);
        accumulatedBorrowV2 = accumulatedBorrowV2.add(
          getUserAccumulatedRewards(p2pBorrowIndex, b.userBorrowInP2PIndex, b.scaledBorrowInP2P).add(
            getUserAccumulatedRewards(poolBorrowIndex, b.userBorrowOnPoolIndex, b.scaledBorrowOnPool)
          )
        );
        accumulatedBorrow = accumulatedBorrow.add(accruedBorrowV1);
        // update the market
        b.market.p2pBorrowIndex = p2pBorrowIndex;
        b.market.poolBorrowIndex = poolBorrowIndex;
        b.market.borrowIndex = borrowIndex;
        b.market.borrowUpdateBlockTimestamp = VERSION_2_TIMESTAMP;
        b.market.borrowUpdateBlockTimestampV1 = VERSION_2_TIMESTAMP;
        b.userBorrowOnPoolIndex = poolBorrowIndex;
        b.userBorrowInP2PIndex = p2pBorrowIndex;
        b.userBorrowIndex = borrowIndex;
      }
      const supplyIndex = await computeSupplyIndex(b.market, currentTimestamp, provider);
      const { p2pSupplyIndex, poolSupplyIndex } = await computeSupplyIndexes(b.market, currentTimestamp, provider);
      const accruedSupplyV1 = getUserAccumulatedRewards(supplyIndex, b.userSupplyIndex, b.underlyingSupplyBalance);
      const accruedSupplyV2 = getUserAccumulatedRewards(
        p2pSupplyIndex,
        b.userSupplyInP2PIndex,
        b.scaledSupplyInP2P
      ).add(getUserAccumulatedRewards(poolSupplyIndex, b.userSupplyOnPoolIndex, b.scaledSupplyOnPool));
      accumulatedSupplyV1 = accumulatedSupplyV1.add(accruedSupplyV1);
      accumulatedSupplyV2 = accumulatedSupplyV2.add(accumulatedSupplyV2);
      if (BigNumber.from(currentTimestamp).gt(VERSION_2_TIMESTAMP))
        accumulatedSupply = accumulatedSupply.add(accruedSupplyV2);
      else accumulatedSupply = accumulatedSupply.add(accruedSupplyV1);

      const borrowIndex = await computeBorrowIndex(b.market, currentTimestamp, provider);
      const { p2pBorrowIndex, poolBorrowIndex } = await computeBorrowIndexes(b.market, currentTimestamp, provider);
      const accruedBorrowV1 = getUserAccumulatedRewards(borrowIndex, b.userBorrowIndex, b.underlyingBorrowBalance);
      const accruedBorrowV2 = getUserAccumulatedRewards(
        p2pBorrowIndex,
        b.userBorrowInP2PIndex,
        b.scaledBorrowInP2P
      ).add(getUserAccumulatedRewards(poolBorrowIndex, b.userBorrowOnPoolIndex, b.scaledBorrowOnPool));
      accumulatedBorrowV1 = accumulatedBorrowV1.add(accruedBorrowV1);
      accumulatedBorrowV2 = accumulatedBorrowV2.add(accumulatedBorrowV2);
      if (BigNumber.from(currentTimestamp).gt(VERSION_2_TIMESTAMP))
        accumulatedBorrow = accumulatedBorrow.add(accruedBorrowV2);
      else accumulatedBorrow = accumulatedBorrow.add(accruedBorrowV1);
      return {
        market: b.market,
        accumulatedSupplyV1,
        accumulatedSupplyV2,
        accumulatedSupply,
        accumulatedBorrowV1,
        accumulatedBorrowV2,
        accumulatedBorrow,
      };
    })
  );
};

export interface MarketRewards {
  market: Market;
  accumulatedSupplyV1: BigNumber;
  accumulatedSupplyV2: BigNumber;
  accumulatedSupply: BigNumber;
  accumulatedBorrowV1: BigNumber;
  accumulatedBorrowV2: BigNumber;
  accumulatedBorrow: BigNumber;
}
export const sumRewards = (marketsRewards: MarketRewards[]) =>
  marketsRewards.reduce((acc, m) => acc.add(m.accumulatedBorrow.add(m.accumulatedSupply)), constants.Zero);

// last update and current timestamp must be in the same Version

const getUserAccumulatedRewards = (marketIndex: BigNumber, userIndex: BigNumber, userBalance: BigNumber) => {
  if (userIndex.gt(marketIndex)) return BigNumber.from(0);
  return marketIndex.sub(userIndex).mul(userBalance).div(WAD); // with 18 decimals
};
const computeSupplyIndex = async (market: Market, currentTimestamp: BigNumberish, provider: providers.Provider) =>
  computeIndex(
    market.address,
    market.supplyIndex,
    market.supplyUpdateBlockTimestampV1,
    currentTimestamp,
    "supplyRate",
    market.lastTotalSupply,
    provider
  );
const computeUpdatedMorphoIndexV2 = async (
  marketAddress: string,
  currentTimestamp: BigNumberish,
  lastMorphoIndex: BigNumber,
  lastUpdateTimestamp: BigNumberish,
  lastPercentSpeed: BigNumber,
  lastTotalScaled: BigNumber,
  marketSide: string,
  provider: providers.Provider
) => {
  // we first compute distribution of each epoch
  const epochs = getEpochsBetweenTimestamps(lastUpdateTimestamp, currentTimestamp) ?? [];
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

    const emission = BigNumber.from(marketsEmission.markets[marketAddress]?.[marketSide] ?? 0);
    const speed = PercentMath.percentMul(emission, lastPercentSpeed);
    const morphoAccrued = deltaTimestamp.mul(speed); // in WEI units;
    const ratio = lastTotalScaled.eq(0) ? BigNumber.from(0) : morphoAccrued.mul(WAD).div(lastTotalScaled); // in 18*2 - decimals units;
    return currentIndex.add(ratio);
  }, lastMorphoIndex);
};

const computeSupplyIndexes = async (market: Market, currentTimestamp: BigNumberish, provider: providers.Provider) => {
  const rateType = "supplyRate";
  const marketAddress = market.address;

  // even if the index is in RAY for Morpho-Aave markets, this is not a big deal since we are using the proportion
  // between p2p and pool volumes
  const totalSupplyP2P = WadRayMath.wadMul(market.scaledSupplyInP2P, market.lastP2PSupplyIndex);
  const totalSupplyOnPool = WadRayMath.wadMul(market.scaledSupplyOnPool, market.lastPoolSupplyIndex);
  const totalSupply = totalSupplyOnPool.add(totalSupplyP2P);
  const lastPercentSpeed = totalSupply.isZero()
    ? constants.Zero
    : totalSupplyP2P.mul(PercentMath.BASE_PERCENT).div(totalSupply);
  return {
    p2pSupplyIndex: await computeUpdatedMorphoIndexV2(
      marketAddress,
      currentTimestamp,
      market.p2pSupplyIndex,
      market.supplyUpdateBlockTimestamp,
      lastPercentSpeed,
      market.scaledSupplyInP2P,
      rateType,
      provider
    ),
    poolSupplyIndex: await computeUpdatedMorphoIndexV2(
      marketAddress,
      currentTimestamp,
      market.poolSupplyIndex,
      market.supplyUpdateBlockTimestamp,
      PercentMath.BASE_PERCENT.sub(lastPercentSpeed),
      market.scaledSupplyOnPool,
      rateType,
      provider
    ),
  };
};
const computeBorrowIndex = async (market: Market, currentTimestamp: BigNumberish, provider: providers.Provider) =>
  computeIndex(
    market.address,
    market.borrowIndex,
    market.borrowUpdateBlockTimestampV1,
    currentTimestamp,
    "borrowRate",
    market.lastTotalBorrow,
    provider
  );

const computeBorrowIndexes = async (market: Market, currentTimestamp: BigNumberish, provider: providers.Provider) => {
  const rateType = "borrowRate";
  const marketAddress = market.address;
  const lastUpdateTimestamp = market.borrowUpdateBlockTimestamp;

  const totalBorrowP2P = WadRayMath.wadMul(market.scaledBorrowInP2P, market.lastP2PBorrowIndex);
  const totalBorrowOnPool = WadRayMath.wadMul(market.scaledBorrowOnPool, market.lastPoolBorrowIndex);
  const totalBorrow = totalBorrowOnPool.add(totalBorrowP2P);
  const lastPercentSpeed = totalBorrow.isZero()
    ? constants.Zero
    : totalBorrowP2P.mul(PercentMath.BASE_PERCENT).div(totalBorrow);
  return {
    p2pBorrowIndex: await computeUpdatedMorphoIndexV2(
      marketAddress,
      currentTimestamp,
      market.p2pBorrowIndex,
      lastUpdateTimestamp,
      lastPercentSpeed,
      market.scaledBorrowInP2P,
      rateType,
      provider
    ),
    poolBorrowIndex: await computeUpdatedMorphoIndexV2(
      marketAddress,
      currentTimestamp,
      market.poolBorrowIndex,
      lastUpdateTimestamp,
      PercentMath.BASE_PERCENT.sub(lastPercentSpeed),
      market.scaledBorrowOnPool,
      rateType,
      provider
    ),
  };
};
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
  // we first compute distribution of each epoch
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

const extractSubgraphBody = (status: number, body: string) => {
  try {
    const data = JSON.parse(body) as QueryUserBalancesResponse;
    const errors = data?.errors ? JSON.stringify(data.errors) : body;
    const errorMessage = `[${status}] - ${errors}`;
    return <const>[data, errorMessage];
  } catch (error) {
    return <const>[null, body];
  }
};

export const getUserBalances = async (graphUrl: string, user: string, block?: number) => {
  const res = await fetch(graphUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: block ? balancesQuery.queryWithBlock : balancesQuery.query,
      variables: { user, block },
    }),
  });
  const body = await res.text();
  const [data, errorMessage] = extractSubgraphBody(res.status, body);
  if (!res.ok || !data?.data) throw Error(errorMessage);
  if (!data.data.user) return undefined;
  return formatGraphBalances(data.data.user);
};

type QueryUserBalancesResponse = { data?: { user?: GraphUserBalances }; errors?: any };
