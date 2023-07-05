import { getDefaultProvider } from "ethers";
import { ChainEventFetcher } from "../../src/distributor/eventFetcher/ChainEventFetcher";
import { BlockTimestamp, RangeRate, DistributorV1 } from "../../src/distributor/Distributor";
import { parseUnits } from "ethers/lib/utils";

const epoch1Distribution = {
  "0x35a18000230da775cac24873d00ff85bccded550": {
    morphoEmittedSupplySide: "762.056250390191969584",
    morphoRatePerSecondSupplySide: "0.00025200322831004",
    morphoRatePerSecondBorrowSide: "0.000648008301368675",
    morphoEmittedBorrowSide: "1959.573215289065064645",
    totalMarketSizeSupplySide: "10783.70738225493536906",
    totalMarketSizeBorrowSide: "391.141735670134320593",
  },
  "0x39aa39c021dfbae8fac545936693ac917d5e7563": {
    morphoEmittedSupplySide: "29591.686149309944514161",
    morphoRatePerSecondSupplySide: "0.009785629915042802",
    morphoRatePerSecondBorrowSide: "0.019574195812658375",
    morphoEmittedBorrowSide: "59192.250692304050427819",
    totalMarketSizeSupplySide: "3221283.468791",
    totalMarketSizeBorrowSide: "226068.161196",
  },
  "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5": {
    morphoEmittedSupplySide: "6458.65733183080224914",
    morphoRatePerSecondSupplySide: "0.002135803619924775",
    morphoRatePerSecondBorrowSide: "0.02456174162913492",
    morphoEmittedBorrowSide: "74274.559316054225865116",
    totalMarketSizeSupplySide: "231.43643991952869814",
    totalMarketSizeBorrowSide: "102.327051025242103302",
  },
  "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643": {
    morphoEmittedSupplySide: "19091.977282206981405282",
    morphoRatePerSecondSupplySide: "0.006313497077774288",
    morphoRatePerSecondBorrowSide: "0.012628888394095763",
    morphoEmittedBorrowSide: "38189.682730415225031208",
    totalMarketSizeSupplySide: "6719167.758929551684796565",
    totalMarketSizeBorrowSide: "3502529.509604331354335828",
  },
  "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4": {
    morphoEmittedSupplySide: "1332.484203818377887451",
    morphoRatePerSecondSupplySide: "0.000440637185066629",
    morphoRatePerSecondBorrowSide: "0.000458622376293839",
    morphoEmittedBorrowSide: "1386.871314178311678776",
    totalMarketSizeSupplySide: "47.281649920248572473",
    totalMarketSizeBorrowSide: "186.995784726445964174",
  },
  "0x7713dd9ca933848f6819f38b8352d9a15ea73f67": {
    morphoEmittedSupplySide: "50.707384102919554981",
    morphoRatePerSecondSupplySide: "0.000016768348119381",
    morphoRatePerSecondBorrowSide: "0.000033541727246298",
    morphoEmittedBorrowSide: "101.429981942443646283",
    totalMarketSizeSupplySide: "8569.325610590706980982",
    totalMarketSizeBorrowSide: "90.307347359317629247",
  },
  "0xccf4429db6322d5c611ee964527d42e5d685dd6a": {
    morphoEmittedSupplySide: "21716.379887181494934519",
    morphoRatePerSecondSupplySide: "0.007181356804008703",
    morphoRatePerSecondBorrowSide: "0.014364868230520859",
    morphoEmittedBorrowSide: "43439.275339885696588192",
    totalMarketSizeSupplySide: "0.54362059",
    totalMarketSizeBorrowSide: "0.00394458",
  },
  "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9": {
    morphoEmittedSupplySide: "20980.963568436107673135",
    morphoRatePerSecondSupplySide: "0.006938163094383159",
    morphoRatePerSecondBorrowSide: "0.010407244641574739",
    morphoEmittedBorrowSide: "31471.445352654161509704",
    totalMarketSizeSupplySide: "502910.069332",
    totalMarketSizeBorrowSide: "397655.427053",
  },
} as Record<string, { morphoRatePerSecondSupplySide: string; morphoRatePerSecondBorrowSide: string }>;
describe("Distributor e2e", () => {
  const provider = getDefaultProvider("http://127.0.0.1:8545");
  describe("age1-epoch1", () => {
    const fetcher = new ChainEventFetcher(provider);
    const from = { block: 14927832, timestamp: Math.floor(new Date("2022-06-08T17:00:06.000Z").getTime() / 1000) };
    const to = { block: 15135480, timestamp: Math.floor(new Date("2022-07-13T17:00:00.000Z").getTime() / 1000) };
    const epoch1RatesFetcher = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getRangeRates(marketSide: string, _from: BlockTimestamp, _to: BlockTimestamp): RangeRate[] {
        const key = marketSide.includes("-Supply") ? "morphoRatePerSecondSupplySide" : "morphoRatePerSecondBorrowSide";
        const id = marketSide.replace("-Supply", "").replace("-Borrow", "");

        return [{ from, to, rate: parseUnits(epoch1Distribution[id][key]) }];
      },
    };
    const distributor = new DistributorV1(epoch1RatesFetcher, fetcher);

    it("should compute the correct distribution", async () => {
      const mcDeploymentBlock = 14860866;
      const morphoCompoundDeploymentTimestamp = await provider.getBlock(mcDeploymentBlock).then((b) => b.timestamp);
      await distributor.run({ block: mcDeploymentBlock, timestamp: morphoCompoundDeploymentTimestamp }, to);

      const { markets, totalDistributed, users } = distributor.getDistributionSnapshot(to);

      expect(markets).toMatchSnapshot();
      expect(totalDistributed).toMatchSnapshot();
      expect(users).toMatchSnapshot();

      const { root, total } = await distributor.generateMerkleTree(to);

      expect(total).toEqual("349999999999999800531676");
      expect(root).toEqual("0xca64d60cf02765803feb6298e4c851689fbc896d0e73c00e0c2f678f353f0d19");
    });
  });
});
