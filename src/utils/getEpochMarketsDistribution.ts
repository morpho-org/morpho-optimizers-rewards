import { providers } from "ethers";
import { ages } from "../ages";
import { timestampToEpoch } from "./timestampToEpoch";
import { MarketsEmission } from "../ages/distributions/MarketsEmission";
import { formatUnits } from "ethers/lib/utils";

export const getMarketsDistribution = async (
  blockNumber?: number,
  provider: providers.Provider = new providers.InfuraProvider(1)
) => {
  const block = await provider.getBlock(blockNumber ?? "latest");
  const epochConfig = timestampToEpoch(block.timestamp);
  if (!epochConfig) throw Error(`No epoch found at timestamp ${block.timestamp}`);
  return getEpochMarketsDistribution(epochConfig.epoch.id, provider);
};

export const getEpochMarketsDistribution = async (epochId: string, provider: providers.Provider) => {
  const [age, epoch] = epochId.split("-");
  let distribution;
  try {
    // try to retrieve distribution from json file
    distribution = require(`../../distribution/${age}-${epoch}/marketsEmission.json`) as MarketsEmission;
    return distribution;
  } catch (e) {
    // need to compute distribution by hand
    console.log("No distribution for epoch", epochId);
    return computeEpochMarketsDistribution(age, epoch, provider);
  }
};

export const computeEpochMarketsDistribution = async (age: string, epoch: string, provider: providers.Provider) => {
  const ageConfig = ages.find((a) => a.ageName === age);
  if (!ageConfig) throw Error(`Unknown age: ${age}`);
  const epochConfig = ageConfig.epochs.find((e) => e.epochName === epoch);
  if (!epochConfig) throw Error(`Unknown epoch: ${age}-${epoch}`);

  const { marketsEmissions } = await ageConfig.distribution(epochConfig, provider); // reverts if snapshotBlock is not defined
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
  return {
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
  } as MarketsEmission;
};
