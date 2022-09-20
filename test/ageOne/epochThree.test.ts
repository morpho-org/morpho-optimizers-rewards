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

describe("Test the distribution for the second epoch", () => {
  const epochConfig = ages[0].epochs[2];
  let usersBalances: UserBalances[];
  let usersAccumulatedRewards: { address: string; accumulatedRewards: string }[];
  const epochOneRoot = ""; // TODO: add root when it is computable

  beforeAll(async () => {
    usersBalances = await fetchUsers(ages[0].subgraphUrl, epochConfig.finalBlock);
    usersAccumulatedRewards = usersBalances.map(({ address, balances }) => ({
      address,
      accumulatedRewards: userBalancesToUnclaimedTokens(address, balances, epochConfig.finalTimestamp).toString(), // with 18 * 2 decimals
    }));
  });

  // TODO unskip at the end of the epoch
  it.skip("Should be finished", () => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    expect(epochConfig.finalTimestamp.lt(currentTimestamp)).toBe(true);
  });

  it("should emit the correct number of tokens", () => {
    const totalEmitted = usersAccumulatedRewards.reduce((a, b) => a.add(b.accumulatedRewards), BigNumber.from(0));
    const totalEpochsTokens = getAccumulatedEmission(epochConfig.id).mul(WAD);
    console.log("Total tokens emitted:", formatUnits(totalEmitted), "over", formatUnits(totalEpochsTokens));
    expectBNApproxEquals(totalEpochsTokens, totalEmitted, 1e10);
    console.log(usersAccumulatedRewards); // object used to dump into distribution/{age}/{epoch}/usersDistribution.json
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
    console.log(JSON.stringify(proofs, null, 2)); // object used to dump into distribution/{age}/{epoch}/proofs.json
    //TODO: uncomment when root is computed
    // expect(proofs.root).toEqual(epochOneRoot);
  });
});
