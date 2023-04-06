import { providers } from "ethers";
import { getEpochFromNumber, timestampToEpoch } from "./timestampToEpoch";
import { MarketsEmissionFs } from "../ages/distributions/MarketsEmissionFs";
import { formatUnits } from "ethers/lib/utils";
import { epochNumberToAgeEpochString, now } from "../helpers";
import { StorageService } from "./StorageService";
import _mapValues from "lodash/mapValues";

export const getMarketsDistribution = async (
  storageService: StorageService,
  timestamp?: number,
  provider: providers.Provider = new providers.InfuraProvider(1),
  force?: boolean
) => {
  const epochConfig = timestampToEpoch(timestamp ?? now());
  if (!epochConfig) throw Error(`No epoch found at timestamp ${timestamp}`);
  return getEpochMarketsDistribution(epochConfig.epoch.epochNumber, provider, storageService, force);
};

export const getEpochMarketsDistribution = async (
  epochNumber: number,
  provider: providers.Provider,
  storageService: StorageService,
  force?: boolean
) => {
  const distribution = await storageService.readMarketDistribution(epochNumber);
  if (distribution && !force) return distribution;
  // need to compute distribution from chain
  return computeEpochMarketsDistribution(epochNumber, provider, storageService, force);
};

export const computeEpochMarketsDistribution = async (
  epochNumber: number,
  provider: providers.Provider,
  storageService: StorageService,
  force?: boolean
) => {
  const distribution = await storageService.readMarketDistribution(epochNumber);
  if (distribution && !force) return distribution;
  console.warn(`Compute distribution for epoch ${epochNumber}`);

  const ageAndEpoch = getEpochFromNumber(epochNumber);
  if (!ageAndEpoch) throw Error(`Unknown epoch ${epochNumber}`);

  const { age, epoch } = ageAndEpoch;

  // Will revert if snapshotBlock is not defined
  const { marketsEmissions } = await age.distribution(age, epoch, provider);

  const formattedMarketsEmissions = _mapValues(marketsEmissions, (market) => ({
    morphoEmittedSupplySide: formatUnits(market!.morphoEmittedSupplySide),
    morphoRatePerSecondSupplySide: formatUnits(market!.morphoRatePerSecondSupplySide),
    morphoRatePerSecondBorrowSide: formatUnits(market!.morphoRatePerSecondBorrowSide),
    morphoEmittedBorrowSide: formatUnits(market!.morphoEmittedBorrowSide),
    totalMarketSizeSupplySide: formatUnits(market!.totalMarketSizeSupplySide, market!.decimals),
    totalMarketSizeBorrowSide: formatUnits(market!.totalMarketSizeBorrowSide, market!.decimals),
  }));

  const { epoch: epochName, age: ageName } = epochNumberToAgeEpochString(epochNumber);

  const result: MarketsEmissionFs = {
    age: ageName,
    epoch: epochName,
    epochNumber: epoch.epochNumber,
    totalEmission: epoch.totalEmission.toString(),
    snapshotProposal: epoch.snapshotProposal?.toString(),
    parameters: {
      snapshotBlock: epoch.snapshotBlock!.toString(),
      initialTimestamp: epoch.initialTimestamp.toString(),
      finalTimestamp: epoch.finalTimestamp.toString(),
      duration: epoch.finalTimestamp.sub(epoch.initialTimestamp).toString(),
    },
    markets: formattedMarketsEmissions,
  };
  await storageService.writeMarketEmission(epochNumber, result, force);
  return result;
};
