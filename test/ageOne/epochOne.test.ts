/* eslint-disable no-console */

import { userBalancesToUnclaimedTokens, UserBalances, fetchUsers, computeMerkleTree } from "../../src/utils";
import { BigNumber, BigNumberish, providers } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import { WAD } from "../../src/helpers";
import { ages } from "../../src";
describe("Test the distribution for the first epoch", () => {
  const epochConfig = ages[0].epochs[0];
  let usersBalances: UserBalances[];
  const epochOneRoot = "0xca64d60cf02765803feb6298e4c851689fbc896d0e73c00e0c2f678f353f0d19";
  let usersAccumulatedRewards: { address: string; accumulatedRewards: string }[];

  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);

  beforeAll(async () => {
    usersBalances = await fetchUsers(ages[0].subgraphUrl, epochConfig.finalBlock);
    usersAccumulatedRewards = await Promise.all(
      usersBalances.map(async ({ address, balances }) => ({
        address,
        accumulatedRewards: await userBalancesToUnclaimedTokens(balances, epochConfig.finalTimestamp, provider).then(
          (r) => r.toString()
        ), // with 18 * 2 decimals
      }))
    );
  });
  it("Should distribute the correct number of tokens over Morpho users", async () => {
    const totalEmitted = usersAccumulatedRewards.reduce((a, b) => a.add(b.accumulatedRewards), BigNumber.from(0));

    console.log("Total tokens emitted:", formatUnits(totalEmitted, 18), "over", epochConfig.totalEmission.toString());

    expectBNApproxEquals(totalEmitted, epochConfig.totalEmission.mul(WAD), 1e9); // 8 over 18 decimals
  });
  it("Should should compute the correct root", async () => {
    const userRewards = usersAccumulatedRewards.filter((b) => b.accumulatedRewards !== "0");
    // remove users with 0 MORPHO to claim
    const { root } = computeMerkleTree(userRewards);
    expect(root).toEqual(epochOneRoot);
  });
});
export const expectBNApproxEquals = (bn1: BigNumber, bn2: BigNumber, precision: BigNumberish) => {
  expect(bn1).toBnApproxEq(bn2, precision);
};
