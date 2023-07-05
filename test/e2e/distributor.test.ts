import { getDefaultProvider } from "ethers";
import { BlockTimestamp, DistributorV1 } from "../../src/distributor/Distributor";
import { InMemoryConfigurationFetcher } from "../../src/distributor/MarketDistributor";
import { now } from "../../src/distributor/MarketDistributor";
import { parseUnits } from "ethers/lib/utils";
import * as fs from "fs";

jest.setTimeout(60 * 15 * 1e3); // 15min
describe("Distributor e2e", () => {
  const provider = getDefaultProvider("http://127.0.0.1:8545");
  let distributor: DistributorV1;

  const currentTs = now();
  beforeAll(async () => {
    distributor = await DistributorV1.fromChain(provider);
  });

  const endedEpochs = InMemoryConfigurationFetcher.getEndedConfigurations(currentTs);

  describe.each(endedEpochs)("Test Users Distribution", (config) => {
    if (config.id === "age1-epoch2") return; // epoch 2 was computed with an outdated script
    it(`should compute the correct distribution for ${config.id}`, async () => {
      const { to: epochTo } = distributor.ratesProvider.idToBlockTimestamp(config.id);
      await distributor.runTo(config.id);

      const { markets, totalDistributed, users } = distributor.getDistributionSnapshot(epochTo as BlockTimestamp);

      expect(markets).toMatchSnapshot();
      expect(totalDistributed).toMatchSnapshot();
      expect(users).toMatchSnapshot();
    });
    it(`should compute the correct merkle tree for ${config.id}`, async () => {
      const { to: epochTo } = distributor.ratesProvider.idToBlockTimestamp(config.id);
      await distributor.runTo(config.id);

      const { root, total, proofs } = await distributor.generateMerkleTree(epochTo as BlockTimestamp);

      await fs.promises.writeFile(
        `distribution/proofs/proofs-${endedEpochs.indexOf(config) + 1}.json`,
        JSON.stringify({ root, total, proofs }, null, 2)
      );

      const totalEmitted = distributor.ratesProvider.marketDistributor.configFetcher.getAccumulatedRewardsEmitted(
        config.id
      );
      expect(totalEmitted).toBnApproxEq(total, parseUnits("0.001"));
      expect(root).toEqual("0xca64d60cf02765803feb6298e4c851689fbc896d0e73c00e0c2f678f353f0d19");
    });
  });
});
