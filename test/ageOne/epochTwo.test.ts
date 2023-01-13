/* eslint-disable no-console */

import {
  userBalancesToUnclaimedTokens,
  UserBalances,
  fetchUsers,
  computeMerkleTree,
  getAccumulatedEmission,
} from "../../src/utils";
import { BigNumber, providers } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import { expectBNApproxEquals } from "./epochOne.test";
import { ages } from "../../src";
import { SUBGRAPH_URL } from "../../src/config";

describe("Test the distribution for the second epoch", () => {
  const epochConfig = ages[0].epochs[1];
  let usersBalances: UserBalances[];
  const epochOneRoot = "0x1a23db78755a76f8213b5790c3e8bef2ad322bc53d40d9e7e9c1b047638a9166";
  let usersAccumulatedRewards: { address: string; accumulatedRewards: string }[];
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);

  beforeAll(async () => {
    usersBalances = await fetchUsers(SUBGRAPH_URL, epochConfig.finalBlock);
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
    const totalFromGraph = usersBalances
      .map((u) => u.balances.map((b) => b.accumulatedMorpho))
      .flat()
      .reduce((acc, b) => acc.add(b), BigNumber.from(0));
    console.log("From graph:", formatUnits(totalFromGraph));
    const totalEmitted = usersAccumulatedRewards.reduce((a, b) => a.add(b.accumulatedRewards), BigNumber.from(0));
    const accumulatedEmission = getAccumulatedEmission(epochConfig.id); // we sum the emissions
    console.log("Total tokens emitted:", formatUnits(totalEmitted, 18), "over", accumulatedEmission.toString());
    expectBNApproxEquals(totalEmitted, accumulatedEmission, 1e10);
  });
  it.skip("Should should compute the correct root", async () => {
    const usersRewards = usersAccumulatedRewards
      // remove users with 0 MORPHO to claim
      .filter((b) => b.accumulatedRewards !== "0");
    const { root } = computeMerkleTree(usersRewards);
    expect(root).toEqual(epochOneRoot);
  });
});
