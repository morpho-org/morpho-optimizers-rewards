import { getMarketsConfiguration } from "../../markets";
import configuration from "./configuration";
import { computeMarketsEmission } from "../../computations/compute-markets-emission";
import { Balance } from "../../types";
import { fetchUsers } from "../../subgraph/fetch";
import { computeUsersDistribution } from "../../computations/compute-users-distribution";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";

export const getMarketsEmission = async () => {
  const ageOneMarketsParameters = await getMarketsConfiguration(
    configuration.epochs.epoch1.initialBlock
  );

  const { marketsEmissions } = computeMarketsEmission(
    ageOneMarketsParameters,
    configuration.epochs.epoch1.totalEmission
  );
  return { marketsEmissions, marketsParameters: ageOneMarketsParameters };
};

export const getMarketsRates = async () => {
  const { marketsEmissions, marketsParameters } = await getMarketsEmission();
  const users: { [user: string]: Balance[] } = await fetchUsers(
    configuration.epochs.epoch1.subgraphUrl,
    configuration.epochs.epoch1.initialBlock,
    Object.keys(marketsEmissions),
    configuration.epochs.epoch1.initialTimestamp.toNumber(),
    configuration.epochs.epoch1.finalTimestamp.toNumber()
  );

  const { usersDistribution, totalMarketMultiplicator, usersMultiplicators } =
    computeUsersDistribution(users, marketsEmissions, configuration.epochs.epoch1.finalTimestamp);
  const totalMultiplicator = Object.keys(totalMarketMultiplicator)
    .map((multiple) =>
      totalMarketMultiplicator[multiple]!.borrow.add(totalMarketMultiplicator[multiple]!.supply)
    )
    .reduce((a, b) => a.add(b), BigNumber.from(0));
  const marketsRates: { [market: string]: { supply: BigNumber; borrow: BigNumber } } = {};

  Object.keys(marketsParameters).forEach((marketAddress) => {
    const marketParams = marketsParameters[marketAddress];
    const marketMultiplicators = totalMarketMultiplicator[marketAddress]!;
    const baseTokenEmission = parseUnits("1000"); //.mul(parseUnits("1")).div(marketParams.price);
    marketsRates[marketAddress] = {
      supply: baseTokenEmission
        .mul(marketMultiplicators.supply)
      //  .mul(3600 * 24 * 365)
        .div(totalMultiplicator),
      borrow: baseTokenEmission
        .mul(marketMultiplicators.borrow)
      //  .mul(3600 * 24 * 365)
        .div(totalMultiplicator),
    };
  });
  return { marketsRates, usersDistribution, usersMultiplicators };
};
