import { ages, allEpochs } from "../ages";
import { BigNumber, constants } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { StorageService } from "./StorageService";

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
      .filter((e) => e.number <= epochNumber)
      .map(async ({ ageConfig, ...epoch }) => {
        const distribution = await storageService.readMarketDistribution(ageConfig.ageName, epoch.epochName);
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
