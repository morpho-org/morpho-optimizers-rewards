import { AgeEpoch, IMarketStorage, isCorrectConfig, MarketDistributor } from "../../src/distributor/MarketDistributor";
import { DistributionFn } from "../../src/distributor/distributionScripts/common";
import { getDefaultProvider } from "ethers";
import _mapValues from "lodash/mapValues";
import { formatUnits } from "ethers/lib/utils";
import ageEpochConfigs from "../../src/distributor/configuration/age-epochs.json";

class InMemoryStorage implements IMarketStorage {
  public marketsEmissions: any;
  async storeMarketsEmissions(config: AgeEpoch, { marketsEmissions }: Awaited<ReturnType<DistributionFn>>) {
    this.marketsEmissions = {
      ...this.marketsEmissions,
      [config.id]: _mapValues(marketsEmissions, (m) => ({
        morphoEmittedSupplySide: formatUnits(m.morphoEmittedSupplySide),
        morphoRatePerSecondSupplySide: formatUnits(m.morphoRatePerSecondSupplySide),

        morphoEmittedBorrowSide: formatUnits(m.morphoEmittedBorrowSide),
        morphoRatePerSecondBorrowSide: formatUnits(m.morphoRatePerSecondBorrowSide),
        totalMarketSizeBorrowSide: formatUnits(m.totalMarketSizeBorrowSide, m.decimals),
        totalMarketSizeSupplySide: formatUnits(m.totalMarketSizeSupplySide, m.decimals),
      })),
    };
  }
}

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

    it(`Should fetch data corectly for ${config.id}`, async () => {
      const store = new InMemoryStorage();
      const marketDistributor = new MarketDistributor(provider, store, {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        blockFromTimestamp: (ts: number, direction: "before" | "after") => Promise.resolve(0),
      });
      await marketDistributor.distribute([config.id]);

      console.log(JSON.stringify(store.marketsEmissions, null, 2));
      expect(store.marketsEmissions).toMatchSnapshot();
    });
  });
});
