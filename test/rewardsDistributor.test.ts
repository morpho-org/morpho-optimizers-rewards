import { MorphoCompoundDistributor } from "../src/RewardsDistributor";
import { constants, providers } from "ethers";
import { MorphoCompound__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { ages } from "../lib";
import * as fs from "fs/promises";
jest.setTimeout(3_600_000);
describe("MorphoRewardsDistributor", () => {
  let rewardsDistributor: MorphoCompoundDistributor;
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
  beforeAll(async () => {
    const morphoCompound = MorphoCompound__factory.connect(addresses.morphoCompound.morpho, provider);
    rewardsDistributor = await MorphoCompoundDistributor.init(provider, morphoCompound);
    console.log("Morpho rewards distributor initialized");
    await fs.writeFile("dump.json", JSON.stringify(rewardsDistributor.store, null, 2));
    // const epoch = ages[0].epochs[0];
    // await rewardsDistributor.applyEpoch(epoch);
  });

  it("should not distribute tokens during initialization", () => {
    const storage = rewardsDistributor.store;
    Object.values(storage.markets).forEach((market) => {
      expect(constants.WeiPerEther.eq(market.borrowIndex)).toBeTruthy();
      expect(constants.WeiPerEther.eq(market.supplyIndex)).toBeTruthy();
    });

    Object.values(storage.users).forEach((user) => {
      Object.values(user).forEach((balance) => {
        expect(balance.accruedMorpho).toEqual("0");
        expect(constants.WeiPerEther.eq(balance.userBorrowIndex)).toBeTruthy();
        expect(constants.WeiPerEther.eq(balance.userSupplyIndex)).toBeTruthy();
      });
    });
  });

  it("should compute correct storage distribution for epoch 1", async () => {
    const epochOne = ages[0].epochs[0];
    await rewardsDistributor.applyEpoch(epochOne);
    const storage = rewardsDistributor.store;

    await fs.writeFile("dump-epoch1.json", JSON.stringify(storage, null, 2));
  });
});
