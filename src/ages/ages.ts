import {
  ageOneDistribution,
  ageTwoDistribution,
  ageThreeDistribution,
  ageFourDistribution,
  ageFiveDistribution,
  ageSixDistribution,
} from "./distributions";
import { BigNumber } from "ethers";
import { AgeConfig, EpochConfig, ProtocolDistribution } from "./ages.types";
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
  age4: ageFourDistribution,
  age5: ageFiveDistribution,
  age6: ageSixDistribution,
};

const computeProtocolDistribution = (
  distribution: (typeof agesData)[0]["epochs"][0]["protocolDistribution"]
): ProtocolDistribution | undefined => {
  if (!distribution) return;
  const protocolDistribution: ProtocolDistribution = { morphoCompound: BigNumber.from(distribution.morphoCompound) };
  if ("morphoAave" in distribution) protocolDistribution.morphoAave = BigNumber.from(distribution.morphoAave);
  return protocolDistribution;
};

export const ages: AgeConfig[] = agesData.map(({ startTimestamp, endTimestamp, epochs, ...data }) => ({
  ...data,
  distribution: distributions[data.ageName as keyof typeof distributions],
  startTimestamp: BigNumber.from(new Date(startTimestamp).getTime() / 1000),
  endTimestamp: BigNumber.from(new Date(endTimestamp).getTime() / 1000),
  epochs: epochs.map(({ initialTimestamp, finalTimestamp, totalEmission, protocolDistribution, ...epoch }) => ({
    ...epoch,
    initialTimestamp: BigNumber.from(new Date(initialTimestamp).getTime() / 1000),
    finalTimestamp: BigNumber.from(new Date(finalTimestamp).getTime() / 1000),
    totalEmission: parseUnits(totalEmission),
    protocolDistribution: computeProtocolDistribution(protocolDistribution),
  })),
}));

export const allEpochs: { age: Omit<AgeConfig, "epochs">; epoch: EpochConfig }[] = ages.flatMap((age) =>
  age.epochs.map((epoch) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { epochs, ...ageConfig } = age;

    return { epoch, age: ageConfig };
  })
);

export const finishedEpochs = allEpochs.filter(({ epoch }) => epoch.finalTimestamp.lte(Math.round(Date.now() / 1000)));

export const startedEpochs = allEpochs.filter(({ epoch }) => epoch.initialTimestamp.lte(Math.round(Date.now() / 1000)));

export const numberOfEpochs = allEpochs.length;
