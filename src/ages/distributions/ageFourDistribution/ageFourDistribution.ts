import { EpochConfig } from "../../ages.types";
import { AgeDistribution } from "../distributions.types";
import { providers } from "ethers";
import getMarketsData from "../../../utils/markets/fetchMarketsData";
import { parseUnits } from "ethers/lib/utils";
import MARKETS from "../markets";
import { MarketEmission } from "../../../utils";
import marketsRepartition from "./marketsRepartition";
import { PercentMath } from "@morpho-labs/ethers-utils/lib/maths";

export const ageFourDistribution = async (
  ageConfig: AgeDistribution,
  { finalTimestamp, initialTimestamp, number, snapshotBlock, totalEmission }: EpochConfig,
  provider?: providers.Provider
) => {
  if (!snapshotBlock) throw Error(`Cannot distribute tokens for epoch ${number}: no snapshotBlock`);

  const duration = finalTimestamp.sub(initialTimestamp);

  const { markets } = await getMarketsData(snapshotBlock, provider!);

  const marketsEmissions = Object.fromEntries(
    Object.entries(marketsRepartition).map(([symbol, { weight }]) => {
      const address = MARKETS[symbol as keyof typeof MARKETS];
      if (!address) throw Error(`Cannot distribute tokens for epoch ${number}: unknown market ${symbol}`);
      const marketData = markets.find((market) => market.address.toLowerCase() === address.toLowerCase());
      if (!marketData) throw Error(`Cannot distribute tokens for epoch ${number}: no market data for ${symbol}`);

      const { morphoSupplyMarketSize, morphoBorrowMarketSize, p2pIndexCursor } = marketData;

      const weightBN = parseUnits((weight / 100).toString(), 4);
      const distribution = PercentMath.percentMul(totalEmission, weightBN);

      const total = morphoSupplyMarketSize.add(marketData.morphoBorrowMarketSize);
      const supply = morphoSupplyMarketSize.mul(distribution).div(total);
      const supplyRate = supply.div(duration);
      const borrow = morphoBorrowMarketSize.mul(distribution).div(total);
      const borrowRate = borrow.div(duration);
      const marketEmission = supply.add(borrow);
      return [
        address.toLowerCase(),
        {
          supply,
          supplyRate,
          borrow,
          borrowRate,
          marketEmission,
          morphoBorrow: morphoBorrowMarketSize,
          morphoSupply: morphoSupplyMarketSize,
          p2pIndexCursor,
        } as MarketEmission,
      ];
    })
  );
  return { marketsEmissions };
};
