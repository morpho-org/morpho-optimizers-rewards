import { providers } from "ethers";
import { getEpochFromNumber, timestampToEpoch } from "./timestampToEpoch";
import { MarketsEmissionFs } from "../ages/distributions/MarketsEmissionFs";
import { formatUnits } from "ethers/lib/utils";
import { now } from "../helpers";
import { StorageService } from "./StorageService";
import { epochNumberToAgeEpochString } from "./helpers";

export const getMarketsDistribution = async (
  storageService: StorageService,
  timestamp?: number,
  provider: providers.Provider = new providers.InfuraProvider(1),
  force?: boolean
) => {
  const epochConfig = timestampToEpoch(timestamp ?? now());
  if (!epochConfig) throw Error(`No epoch found at timestamp ${timestamp}`);
  return getEpochMarketsDistribution(epochConfig.epoch.number, provider, storageService, force);
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

  const formattedMarketsEmissions = Object.fromEntries(
    Object.entries(marketsEmissions).map(([key, marketConfig]) => [
      key,
      {
        supply: formatUnits(marketConfig!.supply),
        supplyRate: marketConfig!.supplyRate.toString(),
        borrowRate: marketConfig!.borrowRate.toString(),
        borrow: formatUnits(marketConfig!.borrow),
        totalMarketSupply: marketConfig!.morphoSupply.toString(),
        totalMarketBorrow: marketConfig!.morphoBorrow.toString(),
      },
    ])
  );
  const { epoch: epochName, age: ageName } = epochNumberToAgeEpochString(epochNumber);
  const result: MarketsEmissionFs = {
    age: ageName,
    epoch: epochName,
    epochNumber: epoch.number,
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
