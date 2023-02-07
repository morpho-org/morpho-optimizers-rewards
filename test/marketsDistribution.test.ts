import { getMarketsDistribution } from "../src/utils/getEpochMarketsDistribution";
import { BigNumber, providers } from "ethers";
import { now } from "../src/helpers";
import { RewardsDistributor__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { ages } from "../src";
describe("Markets distribution", () => {
  it("Should retrieve the latest market distribution", async () => {
    const marketDistribution = await getMarketsDistribution();
    expect(marketDistribution).not.toBeUndefined();
  });
  it("Should retrieve the latest market distribution at one given block", async () => {
    const provider = await providers.getDefaultProvider();
    const marketDistribution = await getMarketsDistribution(now(), provider);
    expect(marketDistribution).not.toBeUndefined();
  });
  it("Should include the snapshotProposal field for age3", async () => {
    const marketDistribution = await getMarketsDistribution(1672326000);
    expect(marketDistribution.snapshotProposal).toBeTruthy();
  });
  // delete this test if snapshot has been deprecated
  it("Should now include the snapshotProposal field (true until deprecation)", async () => {
    const marketDistribution = await getMarketsDistribution();
    expect(marketDistribution.snapshotProposal).toBeTruthy();
  });
});

describe("Age 1 Epoch 2 approximation", () => {
  const onChainDistribution = require("../distribution/fromDeprecatedScript/proofs-2.json");
  const newDistribution = require("../distribution/proofs/proofs-2.json");

  it("Should have the same number of users", () =>
    expect(Object.keys(onChainDistribution.proofs).length).toEqual(Object.keys(newDistribution.proofs).length));

  it("Should contains the same users", () => {
    const newDistriUsers = Object.keys(newDistribution.proofs);
    Object.keys(onChainDistribution.proofs).forEach((onChainUser) => expect(newDistriUsers).toContain(onChainUser));
  });

  it("Should derive of 7e-18 only", () => {
    const newDistriUsers = Object.entries(newDistribution.proofs);
    Object.entries(onChainDistribution.proofs).forEach(([onChainUser, onChainDistrib]) => {
      const [, compareTo] = newDistriUsers.find(([u]) => u === onChainUser)!;
      // @ts-ignore unknown type
      const compareToAmount = BigNumber.from(compareTo.amount);
      // @ts-ignore unknown type
      const onChainAmount = BigNumber.from(onChainDistrib.amount);
      const dust = compareToAmount.gte(onChainAmount)
        ? compareToAmount.sub(onChainAmount)
        : onChainAmount.sub(compareToAmount);
      // the max derivation from script version one and script version two is 7 * 1e-18 $MORPHO
      expect(dust).toBnLte(7);
    });
  });

  it("Should have the correct root on chain", async () => {
    const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
    const age1epoch2 = ages[0].epochs[1];
    const root = require("../distribution/fromDeprecatedScript/proofs-2.json").root;
    const rewardsDistributor = RewardsDistributor__factory.connect(addresses.morphoDao.rewardsDistributor, provider);
    const onchainRoot = await rewardsDistributor.currRoot({ blockTag: age1epoch2.finalBlock! + 10_000 });
    expect(onchainRoot).toEqual(root);
  });
});
