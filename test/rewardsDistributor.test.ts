import { MorphoCompoundRewardsDistributor } from "../src/RewardsDistributor";
import { BigNumber, constants, providers } from "ethers";
import { MorphoCompound__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { ages, allEpochs } from "../src";
import * as fs from "fs/promises";
import { fetchUsers } from "../src/utils";
import { expectBNApproxEquals } from "./ageOne/epochOne.test";
jest.setTimeout(3_600_000);

let desc = describe;
if (process.env.SKIP_DISTRIBUTOR) desc = desc.skip;
desc("MorphoRewardsDistributor for Compound only", () => {
  let rewardsDistributor: MorphoCompoundRewardsDistributor;
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);

  beforeAll(async () => {
    const morphoCompound = MorphoCompound__factory.connect(addresses.morphoCompound.morpho, provider);
    if (process.env.INIT_DUMP_BLOCK) {
      // Use a dump for initialization
      const dump = require(`../storages/dump-${process.env.INIT_DUMP_BLOCK}.json`);
      rewardsDistributor = MorphoCompoundRewardsDistributor.initFromDump(provider, morphoCompound, dump);
      console.log("Morpho rewards distributor initialized from dump");
    } else {
      rewardsDistributor = await MorphoCompoundRewardsDistributor.init(provider, morphoCompound);
      console.log("Morpho rewards distributor initialized");
      await saveStorage(rewardsDistributor.store);
    }
    await fs.writeFile("dump.json", JSON.stringify(rewardsDistributor.store, null, 2));
    // const epoch = ages[0].epochs[0];
    // await rewardsDistributor.applyEpoch(epoch);
  });

  it("should not distribute tokens during initialization", () => {
    const storage = rewardsDistributor.store;
    const epochOne = allEpochs[0];
    if (rewardsDistributor.lastBlockSynced > epochOne.initialBlock!) return;
    Object.values(storage.markets).forEach((market) => {
      expect(BigNumber.from(market.borrowIndex).isZero()).toBeTruthy();
      expect(BigNumber.from(market.supplyIndex).isZero()).toBeTruthy();
    });

    Object.values(storage.users).forEach((user) => {
      Object.values(user).forEach((balance) => {
        expect(balance.accruedMorpho).toEqual("0");
        expect(BigNumber.from(balance.userBorrowIndex).isZero()).toBeTruthy();
        expect(BigNumber.from(balance.userSupplyIndex).isZero()).toBeTruthy();
      });
    });
  });

  describe("Epoch one", () => {
    const epochOne = ages[0].epochs[0];
    const epochOneRoot = require("../distribution/proofs/proofs-1.json").root;
    beforeAll(async () => {
      await rewardsDistributor.applyEpoch(epochOne);
    });

    it("Should compute correct storage distribution for epoch 1 compared to the subgraph", async () => {
      const storage = rewardsDistributor.store;
      // first retrieve the state of the subgraph at the end of the first epoch
      const graphDistribution = await fetchUsers(ages[0].subgraphUrl, epochOne.finalBlock);
      // then, compare if each user balance is correct
      expect(graphDistribution).toHaveLength(Object.keys(storage.users).length);
      graphDistribution.map((user) =>
        user.balances.map((balance) => {
          const storageBalance = storage.users[user.address][balance.market.address];
          expect(storageBalance).not.toBeUndefined();
          expect(storageBalance.accruedMorpho).toEqual(balance.accumulatedMorpho.toString());
          expect(storageBalance.userBorrowIndex).toEqual(balance.userBorrowIndex.toString());
          expect(storageBalance.userSupplyIndex).toEqual(balance.userSupplyIndex.toString());
          expect(storageBalance.userSupplyBalance).toEqual(balance.underlyingSupplyBalance.toString());
          expect(storageBalance.userBorrowBalance).toEqual(balance.underlyingBorrowBalance.toString());
        })
      );
      await saveStorage(storage);
    });

    it("Should distribute the correct amount of rewards", async () => {
      const totalEmitted = await rewardsDistributor.totalEmitted();
      console.log("totalEmitted", totalEmitted.toString(), "over", epochOne.totalEmission.toString());
      expectBNApproxEquals(totalEmitted, epochOne.totalEmission.mul(constants.WeiPerEther), 1e9);
    });
    it("Should compute the correct merkle root", async () => {
      const { root } = await rewardsDistributor.computeMerkleTree();
      expect(root).toEqual(epochOneRoot);
    });
  });
});

const saveStorage = (storage: { markets: object; users: { [userAddress: string]: object }; currentBlock: number }) =>
  fs.writeFile(`./storages/dump-${storage.currentBlock}.json`, JSON.stringify(storage, null, 4));
