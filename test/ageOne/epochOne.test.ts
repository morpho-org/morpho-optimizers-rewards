/* eslint-disable no-console */

import { userBalancesToUnclaimedTokens, UserBalances, fetchUsers, computeMerkleTree } from "../../src/utils";
import { BigNumber, BigNumberish } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import { WAD } from "../../src/helpers";
import { ages } from "../../src";
describe("Test the distribution for the first epoch", () => {
  const epochConfig = ages[0].epochs[0];
  let usersBalances: UserBalances[];
  const epochOneRoot = "0xca64d60cf02765803feb6298e4c851689fbc896d0e73c00e0c2f678f353f0d19";
  beforeAll(async () => {
    usersBalances = await fetchUsers(ages[0].subgraphUrl, epochConfig.finalBlock);
  });
  it("Should distribute the correct number of tokens over Morpho users", async () => {
    const usersAccumulatedRewards = usersBalances.map(({ address, balances }) => ({
      address,
      accumulatedRewards: userBalancesToUnclaimedTokens(balances, epochConfig.finalTimestamp).toString(), // with 18 * 2 decimals
    }));
    const totalEmitted = usersAccumulatedRewards.reduce((a, b) => a.add(b.accumulatedRewards), BigNumber.from(0));

    console.log("Total tokens emitted:", formatUnits(totalEmitted, 18), "over", epochConfig.totalEmission.toString());

    expectBNApproxEquals(totalEmitted, epochConfig.totalEmission.mul(WAD), 1e9); // 8 over 18 decimals
  });
  it("Should should compute the correct root", async () => {
    const usersAccumulatedRewards = usersBalances
      .map(({ address, balances }) => ({
        address,
        accumulatedRewards: userBalancesToUnclaimedTokens( balances, epochConfig.finalTimestamp).toString(), // with 18 * 2 decimals
      }))
      // remove users with 0 MORPHO to claim
      .filter((b) => b.accumulatedRewards !== "0");
    const { root } = computeMerkleTree(usersAccumulatedRewards);
    expect(root).toEqual(epochOneRoot);
  });
});
export const expectBNApproxEquals = (bn1: BigNumber, bn2: BigNumber, precision: BigNumberish) => {
  const diff = bn1.gt(bn2) ? bn1.sub(bn2) : bn2.sub(bn1);
  expect(diff.lte(precision)).toEqual(true);
};
