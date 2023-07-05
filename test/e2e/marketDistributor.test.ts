import { isCorrectConfig, MarketDistributor } from "../../src/distributor/MarketDistributor";
import { getDefaultProvider } from "ethers";
import _mapValues from "lodash/mapValues";
import { formatUnits } from "ethers/lib/utils";
import ageEpochConfigs from "../../src/distributor/configuration/age-epochs.json";
import { EtherscanBlockFetcher } from "../../src/distributor/blockFetcher/EtherscanBlockFetcher";

describe("Market Distributor e2e", () => {
  const provider = getDefaultProvider("http://localhost:8545");
  describe.each(ageEpochConfigs)("Age Epoch distribution ", (config) => {
    it(`Should validate configuration for ${config.id} `, () => {
      expect(isCorrectConfig(config)).toBe(true);
      const tsFrom = new Date(config.initialTimestamp).getTime();
      const tsTo = new Date(config.finalTimestamp).getTime();
      expect(tsTo).toBeGreaterThan(tsFrom);
      const oneMonthInMs = 3600 * 24 * 30 * 1e3;
      expect(tsTo - tsFrom).toBeGreaterThan(oneMonthInMs);
    });

    it(`Should fetch data correctly for ${config.id}`, async () => {
      const marketDistributor = new MarketDistributor(
        provider,
        new EtherscanBlockFetcher(process.env.ETHERSCAN_API_KEY!)
      );
      const ageEpochResults = await marketDistributor.distribute([config.id]);

      console.log(JSON.stringify(ageEpochResults, null, 2));
      const store = _mapValues(ageEpochResults, ({ marketsEmissions }) =>
        _mapValues(marketsEmissions, (m) => ({
          morphoEmittedSupplySide: formatUnits(m.morphoEmittedSupplySide),
          morphoRatePerSecondSupplySide: formatUnits(m.morphoRatePerSecondSupplySide),

          morphoEmittedBorrowSide: formatUnits(m.morphoEmittedBorrowSide),
          morphoRatePerSecondBorrowSide: formatUnits(m.morphoRatePerSecondBorrowSide),
          totalMarketSizeBorrowSide: formatUnits(m.totalMarketSizeBorrowSide, m.decimals),
          totalMarketSizeSupplySide: formatUnits(m.totalMarketSizeSupplySide, m.decimals),
        }))
      );

      expect(store).toMatchSnapshot();
    });
  });
});
