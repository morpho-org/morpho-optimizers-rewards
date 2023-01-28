import { ageOneDistribution, ageTwoDistribution, ageThreeDistribution } from "./distributions";
import { BigNumber } from "ethers";
import { AgeConfig, ProtocolDistribution } from "./ages.types";
import { parseUnits } from "ethers/lib/utils";
import agesData from "./ages.data.json";

/**
 * Check the docs for repartition explanation
 * https://docs.morpho.xyz/usdmorpho/ages-and-epochs
 */

const distributions = {
  age1: ageOneDistribution,
  age2: ageTwoDistribution,
  age3: ageThreeDistribution,
};

const computeProtocolDistribution = (
  distribution: typeof agesData[0]["epochs"][0]["protocolDistribution"]
): ProtocolDistribution | undefined => {
  if (!distribution) return;
  const protocolDistribution: ProtocolDistribution = { morphoCompound: BigNumber.from(distribution.morphoCompound) };
  if ("morphoAave" in distribution) protocolDistribution.morphoAave = BigNumber.from(distribution.morphoAave);
  return protocolDistribution;
};

export const ages: AgeConfig[] = agesData.map((data) => {
  // @ts-ignore
  const distribution = distributions[data.ageName];
  const startTimestamp = BigNumber.from(data.startTimestamp);
  const endTimestamp = BigNumber.from(data.endTimestamp);
  const epochs = data.epochs.map((epoch) => {
    const initialTimestamp = BigNumber.from(epoch.initialTimestamp);
    const finalTimestamp = BigNumber.from(epoch.finalTimestamp);
    const totalEmission = parseUnits(epoch.totalEmission);
    const protocolDistribution = computeProtocolDistribution(epoch.protocolDistribution);
    const finalBlock = epoch.finalBlock ?? undefined;
    const initialBlock = epoch.initialBlock ?? undefined;
    const snapshotBlock = epoch.snapshotBlock ?? undefined;
    return {
      ...epoch,
      initialTimestamp,
      finalTimestamp,
      totalEmission,
      protocolDistribution,
      finalBlock,
      initialBlock,
      snapshotBlock,
    };
  });
  return { ...data, distribution, startTimestamp, endTimestamp, epochs };
});

export const allEpochs = ages.flatMap((age, ageId) =>
  age.epochs.map((epoch, epochId) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { epochs, ...ageConfig } = age;
    return { ...epoch, age: age.ageName, ageId, epochId, ageConfig };
  })
);

export const finishedEpochs = allEpochs.filter((epoch) => epoch.finalTimestamp.lte(Math.round(Date.now() / 1000)));

export const startedEpochs = allEpochs.filter((epoch) => epoch.initialTimestamp.lte(Math.round(Date.now() / 1000)));

export const numberOfEpochs = allEpochs.length;
