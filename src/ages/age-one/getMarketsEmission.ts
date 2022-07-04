import { getMarketsConfiguration } from "../../markets";
import configuration from "./configuration";
import { computeMarketsEmission } from "../../computations/compute-markets-emission";

export const getMarketsEmission = async (epoch: keyof typeof configuration.epochs) => {
  const ageOneMarketsParameters = await getMarketsConfiguration(configuration.epochs[epoch].initialBlock);

  const { marketsEmissions, liquidity } = computeMarketsEmission(
    ageOneMarketsParameters,
    configuration.epochs[epoch].totalEmission,
    configuration.epochs[epoch].finalTimestamp.sub(configuration.epochs[epoch].initialTimestamp),
  );
  return { marketsEmissions, marketsParameters: ageOneMarketsParameters, liquidity };
};
