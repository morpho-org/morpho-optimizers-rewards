import { ages } from "../ages";
import { BigNumber } from "ethers";

/**
 * Returns the total distributed rewards for the previous epochs including the current one
 * @param epochId "<ageName-epochName>"
 */
export const getAccumulatedEmission = (epochId: string) => {
  const epochEmissions = ages
    .map((a) => a.epochs.map((epoch) => ({ id: epoch.id, distributed: epoch.totalEmission })))
    .flat();
  const currentEpoch = epochEmissions.find((e) => e.id === epochId);
  if (!currentEpoch) throw Error(`Unknown epoch id ${epochId}`);
  const currentEpochIndex = epochEmissions.indexOf(currentEpoch);
  return epochEmissions
    .filter((e, index) => index <= currentEpochIndex)
    .reduce((acc, b) => acc.add(b.distributed), BigNumber.from(0));
};
