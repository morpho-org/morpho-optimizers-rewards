import { providers } from "ethers";
import { ages } from "../ages";
import { timestampToEpoch } from "./timestampToEpoch";
import { MarketsEmission } from "../ages/distributions/MarketsEmission";
import { formatUnits } from "ethers/lib/utils";
import { now } from "../helpers";
import { StorageService } from "./StorageService";

export const getMarketsDistribution = async (
  storageService: StorageService,
  timestamp?: number,
  provider: providers.Provider = new providers.InfuraProvider(1)
) => {
  const epochConfig = timestampToEpoch(timestamp ?? now());
  if (!epochConfig) throw Error(`No epoch found at timestamp ${timestamp}`);
  return getEpochMarketsDistribution(epochConfig.epoch.id, provider, storageService);
};

export const getEpochMarketsDistribution = async (
  epochId: string,
  provider: providers.Provider,
  storageService: StorageService
) => {
  const [age, epoch] = epochId.split("-");
  const distribution = await storageService.readMarketDistribution(age, epoch);
  if (distribution) return distribution;
  // need to compute distribution from chain
  return computeEpochMarketsDistribution(age, epoch, provider, storageService);
};

export const computeEpochMarketsDistribution = async (
  age: string,
  epoch: string,
  provider: providers.Provider,
  storageService: StorageService
) => {
  const distribution = await storageService.readMarketDistribution(age, epoch);
  if (distribution) return distribution;
  console.warn(`Commpute distribution for epoch ${age}-${epoch}`);
  const ageConfig = ages.find((a) => a.ageName === age);
  if (!ageConfig) throw Error(`Unknown age: ${age}`);
  const epochConfig = ageConfig.epochs.find((e) => e.epochName === epoch);
  if (!epochConfig) throw Error(`Unknown epoch: ${age}-${epoch}`);

  // Will revert if snapshotBlock is not defined
  const { marketsEmissions } = await ageConfig.distribution(ageConfig, epochConfig, provider);

  const formattedMarketsEmissions = Object.fromEntries(
    Object.entries(marketsEmissions).map(([key, marketConfig]) => [
      key,
      {
        supply: formatUnits(marketConfig!.supply),
        supplyRate: marketConfig!.supplyRate.toString(),
        borrowRate: marketConfig!.borrowRate.toString(),
        borrow: formatUnits(marketConfig!.borrow),
      },
    ])
  );
  const result: MarketsEmission = {
    age,
    epoch,
    totalEmission: epochConfig.totalEmission.toString(),
    parameters: {
      snapshotBlock: epochConfig.snapshotBlock!.toString(),
      initialTimestamp: epochConfig.initialTimestamp.toString(),
      finalTimestamp: epochConfig.finalTimestamp.toString(),
      duration: epochConfig.finalTimestamp.sub(epochConfig.initialTimestamp).toString(),
    },
    markets: formattedMarketsEmissions,
  };
  await storageService.writeMarketEmission(age, epoch, result);
  return result;
};
