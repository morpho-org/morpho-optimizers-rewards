import { getDefaultProvider, providers } from "ethers";
import { MarketsEmissionFs } from "../ages/distributions/MarketsEmissionFs";
import { formatUnits } from "ethers/lib/utils";
import { now } from "../helpers";
import { StorageService } from "./StorageService";
import _mapValues from "lodash/mapValues";
import { epochUtils } from "../ages";

export const getMarketsDistribution = async (
  storageService: StorageService,
  timestamp?: number,
  provider: providers.Provider = getDefaultProvider(process.env.RPC_URL),
  force?: boolean
) => {
  const epochConfig = await epochUtils.timestampToEpoch(timestamp ?? now());

  return getEpochMarketsDistribution(epochConfig.id, provider, storageService, force);
};

export const getEpochMarketsDistribution = async (
  epochId: string,
  provider: providers.Provider,
  storageService: StorageService,
  force?: boolean
) => {
  const distribution = await storageService.readMarketDistribution(epochId);
  if (distribution && !force) return distribution;
  // need to compute distribution from chain
  return computeEpochMarketsDistribution(epochId, provider, storageService, force);
};

export const computeEpochMarketsDistribution = async (
  epochId: string,
  provider: providers.Provider,
  storageService: StorageService,
  force?: boolean
) => {
  const distribution = await storageService.readMarketDistribution(epochId);
  if (distribution && !force) return distribution;
  console.warn(`Compute distribution for ${epochId}`);

  const epoch = await epochUtils.getEpoch(epochId);

  if (!epoch.snapshotBlock) throw Error(`No snapshot block found for ${epochId}`);

  const { marketsEmissions } = await epoch.distributionScript({
    ...epoch,
    ...epoch.distributionParameters,
    provider,
    snapshotBlock: epoch.snapshotBlock!,
  });

  const formattedMarketsEmissions = _mapValues(marketsEmissions, (market) => ({
    morphoEmittedSupplySide: formatUnits(market!.morphoEmittedSupplySide),
    morphoRatePerSecondSupplySide: formatUnits(market!.morphoRatePerSecondSupplySide),
    morphoRatePerSecondBorrowSide: formatUnits(market!.morphoRatePerSecondBorrowSide),
    morphoEmittedBorrowSide: formatUnits(market!.morphoEmittedBorrowSide),
    totalMarketSizeSupplySide: formatUnits(market!.totalMarketSizeSupplySide, market!.decimals),
    totalMarketSizeBorrowSide: formatUnits(market!.totalMarketSizeBorrowSide, market!.decimals),
  }));

  const result: MarketsEmissionFs = {
    epochId: epoch.id,
    totalEmission: formatUnits(epoch.distributionParameters.totalEmission),
    snapshotProposal: epoch.distributionParameters.snapshotProposal?.toString(),
    parameters: {
      ...epoch.distributionParameters,
      snapshotBlock: epoch.snapshotBlock,
      initialTimestamp: epoch.initialTimestamp,
      finalTimestamp: epoch.finalTimestamp,
      duration: epoch.finalTimestamp - epoch.initialTimestamp,
    },
    markets: formattedMarketsEmissions,
  };
  await storageService.writeMarketEmission(epochId, result, force);
  return result;
};
