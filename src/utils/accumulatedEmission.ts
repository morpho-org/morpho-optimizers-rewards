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
    .map((a) => a.epochs.map((epoch) => ({ number: epoch.epochNumber, distributed: epoch.totalEmission })))
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
      .filter(({ epoch }) => epoch.epochNumber <= epochNumber)
      .map(async ({ epoch }) => {
        const distribution = await storageService.readMarketDistribution(epoch.epochNumber);
        const marketContent = distribution?.markets[market];
        return {
          supply: marketContent?.morphoEmittedSupplySide
            ? parseUnits(marketContent.morphoEmittedSupplySide)
            : constants.Zero,
          borrow: marketContent?.morphoEmittedBorrowSide
            ? parseUnits(marketContent.morphoEmittedBorrowSide)
            : constants.Zero,
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
