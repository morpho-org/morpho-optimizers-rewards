import { ages, allEpochs } from "../ages";
import { BigNumber, constants } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { StorageService } from "./StorageService";

/**
 * Returns the total distributed rewards for the previous epochs including the current one
 * @param epochNumber The number of the epoch
 */
export const getAccumulatedEmission = (epochNumber: number) => {
  const epochEmissions = ages
    .map((a) => a.epochs.map((epoch) => ({ number: epoch.number, distributed: epoch.totalEmission })))
    .flat();
  const currentEpoch = epochEmissions.find((e) => e.number === epochNumber);
  if (!currentEpoch) throw Error(`Unknown epoch number ${epochNumber}`);
  const currentEpochIndex = epochEmissions.indexOf(currentEpoch);
  return epochEmissions
    .filter((e, index) => index <= currentEpochIndex)
    .reduce((acc, b) => acc.add(b.distributed), constants.Zero);
};

/**
 * Returns the total distributed rewards for the previous epochs including the current one on one given market
 */
export const getAccumulatedEmissionPerMarket = (
  market: string,
  epochNumber: number,
  storageService: StorageService
): Promise<{ supply: BigNumber; borrow: BigNumber }> =>
  Promise.all(
    allEpochs
      .filter(({ epoch }) => epoch.number <= epochNumber)
      .map(async ({ epoch }) => {
        const distribution = await storageService.readMarketDistribution(epoch.number);
        const marketContent = distribution?.markets[market];
        return {
          supply: marketContent?.supply ? parseUnits(marketContent.supply) : constants.Zero,
          borrow: marketContent?.borrow ? parseUnits(marketContent.borrow) : constants.Zero,
        };
      })
  ).then((r) =>
    r.reduce(
      (acc, market) => ({
        supply: acc.supply.add(market.supply),
        borrow: acc.borrow.add(market.borrow),
      }),
      { supply: constants.Zero, borrow: constants.Zero }
    )
  );
