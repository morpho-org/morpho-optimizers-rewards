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
jest.setTimeout(100000);
describe("Test the distribution for the third epoch", () => {
  const epochConfig = ages[0].epochs[2];
  let usersBalances: UserBalances[];
  let usersAccumulatedRewards: { address: string; accumulatedRewards: string }[];
  const epochOneRoot = "0xa033808b8ad6b65291bc542b033f869ed82412707ca7127f4d3564d0b6d8abb3";

  beforeAll(async () => {
    usersBalances = await fetchUsers(ages[0].subgraphUrl, epochConfig.finalBlock);
    usersAccumulatedRewards = usersBalances.map(({ address, balances }) => ({
      address,
      accumulatedRewards: userBalancesToUnclaimedTokens(address, balances, epochConfig.finalTimestamp).toString(), // with 18 decimals
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

  it("should emit the correct number of tokens", async () => {
    const totalEmitted = usersAccumulatedRewards.reduce((a, b) => a.add(b.accumulatedRewards), BigNumber.from(0));
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
    // remove users with 0 MORPHO to claim
    usersAccumulatedRewards = usersAccumulatedRewards.filter((b) => b.accumulatedRewards !== "0");
    const { root } = computeMerkleTree(usersAccumulatedRewards);
    expect(root).toEqual(epochOneRoot);
  });
  it("Should sum proofs to the total token emmited", async () => {
    // remove users with 0 MORPHO to claim
    usersAccumulatedRewards = usersAccumulatedRewards.filter((b) => b.accumulatedRewards !== "0");
    const { proofs } = computeMerkleTree(usersAccumulatedRewards);
    const totalEmitted = Object.values(proofs)
      .map((proof) => BigNumber.from(proof.amount))
      .reduce((acc, b) => acc.add(b), BigNumber.from(0));
    const totalEmittedTheorical = ages[0].epochs.reduce(
      (acc, epoch) => acc.add(epoch.totalEmission.mul(WAD)),
      BigNumber.from(0)
    );
    console.log(formatUnits(totalEmitted), "over", formatUnits(totalEmittedTheorical));
    expectBNApproxEquals(totalEmitted, totalEmittedTheorical, 1e10);
  });
});
