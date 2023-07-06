import { epochsBefore, rawEpochs } from "../ages";
import { BigNumber, constants } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { StorageService } from "./StorageService";

/**
 * Returns the total distributed rewards for the previous epochs including the current one
 * @param epochNumber The number of the epoch
 */
export const getAccumulatedEmission = (epochId: string) => {
  const epochIndex = rawEpochs.findIndex((epoch) => epoch.id === epochId);
  if (epochIndex === -1) throw Error(`Unknown epoch id ${epochId}`);

  return rawEpochs
    .slice(0, epochIndex + 1)
    .reduce((acc, epoch) => acc.add(parseUnits(epoch.distributionParameters.totalEmission)), constants.Zero);
};

/**
 * Returns the total distributed rewards for the previous epochs including the current one on one given market
 */
export const getAccumulatedEmissionPerMarket = async (
  market: string,
  epochId: string,
  storageService: StorageService
): Promise<{ supply: BigNumber; borrow: BigNumber }> => {
  const epochs = await epochsBefore(epochId, true);
  return Promise.all(
    epochs.map(async (epoch) => {
      const distribution = await storageService.readMarketDistribution(epoch.id);
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
};
