/* eslint-disable no-console */

import {
  userBalancesToUnclaimedTokens,
  UserBalances,
  fetchUsers,
  computeMerkleTree,
  getAccumulatedEmission,
} from "../../src/utils";
import { BigNumber } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import { WAD } from "../../src/helpers";
import { expectBNApproxEquals } from "./epochOne.test";
import { ages } from "../../src";

describe("Test the distribution for the third epoch", () => {
  const epochConfig = ages[0].epochs[2];
  let usersBalances: UserBalances[];
  let usersAccumulatedRewards: { address: string; accumulatedRewards: string }[];
  const epochOneRoot = ""; // TODO: add root when it is computable

  beforeAll(async () => {
    console.log("Final block", epochConfig.finalBlock);
    usersBalances = await fetchUsers(ages[0].subgraphUrl, epochConfig.finalBlock);
    usersAccumulatedRewards = usersBalances.map(({ address, balances }) => ({
      address,
      accumulatedRewards: userBalancesToUnclaimedTokens(address, balances, epochConfig.finalTimestamp).toString(), // with 18 * 2 decimals
    }));
  });

  it("Should be finished and have final block", async () => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    expect(epochConfig.finalTimestamp.lt(currentTimestamp)).toBe(true);
    expect(epochConfig.finalBlock).not.toBeUndefined();
  });
  it("Should distribute the correct number of tokens", async () => {
    const distribution = require("../../distribution/age1/epoch3/marketsEmission.json");
    const duration = BigNumber.from(distribution.parameters.duration);
    const emitted = (Object.values(distribution.markets) as { supplyRate: string; borrowRate: string }[])
      .map((market) => BigNumber.from(market.supplyRate).add(market.borrowRate).mul(duration))
      .reduce((acc, b) => acc.add(b), BigNumber.from(0));
    const totalEmittedInTheory = epochConfig.totalEmission.mul(WAD);
    console.log(formatUnits(emitted), "over", formatUnits(totalEmittedInTheory));
    expectBNApproxEquals(emitted, totalEmittedInTheory, 1e10);
    expect(epochConfig.finalBlock).not.toBeUndefined();
  });

  it.skip("should emit the correct number of tokens", () => {
    const totalEmitted = usersAccumulatedRewards.reduce((a, b) => a.add(b.accumulatedRewards), BigNumber.from(0));
    console.log(epochConfig.id);
    const fromGraph = usersBalances
      .map((b) => b.balances.map((b2) => b2.accumulatedMorpho))
      .flat()
      .reduce((a, b) => a.add(b), BigNumber.from(0));
    console.log("from graph", formatUnits(fromGraph));
    const totalEpochsTokens = getAccumulatedEmission(epochConfig.id).mul(WAD);
    console.log("Total tokens emitted:", formatUnits(totalEmitted), "over", formatUnits(totalEpochsTokens));
    expectBNApproxEquals(totalEpochsTokens, totalEmitted, 1e10);
  });

  it("Should should compute the correct root", async () => {
    const usersAccumulatedRewards = usersBalances
      .map(({ address, balances }) => ({
        address,
        accumulatedRewards: userBalancesToUnclaimedTokens(address, balances, epochConfig.finalTimestamp).toString(), // with 18 * 2 decimals
      }))
      // remove users with 0 MORPHO to claim
      .filter((b) => b.accumulatedRewards !== "0");
    const proofs = computeMerkleTree(usersAccumulatedRewards);
    // console.log(JSON.stringify(proofs, null, 2)); // object used to dump into distribution/{age}/{epoch}/proofs.json
    //TODO: uncomment when root is computed
    // expect(proofs.root).toEqual(epochOneRoot);
  });
});
