import { fetchUsers } from "../../src/graph/fetch";
import { userBalancesToUnclaimedTokens } from "../../src/ages/age-one/getUserUnclaimedTokens";
import { BigNumber, BigNumberish } from "ethers";
import configuration from "../../src/ages/age-one/configuration";
import { formatUnits } from "ethers/lib/utils";
import { WAD } from "../../src/helpers/constants";
import { UserBalances } from "../../src/graph/types";
import { computeMerkleTree } from "../../src/computations/compute-merkle-tree";

describe("Test the distribution for the first epoch", () => {
  const epochConfig = configuration.epochs.epoch1;
  let usersBalances: UserBalances[];
  const epochOneRoot = "0xca64d60cf02765803feb6298e4c851689fbc896d0e73c00e0c2f678f353f0d19";
  beforeAll(async () => {
    usersBalances = await fetchUsers(epochConfig.subgraphUrl);
  });
  it("Should distribute the correct number of tokens over Morpho users", async () => {
    const usersUnclaimedRewards = usersBalances.map(({ address, balances }) => ({
      address,
      unclaimedRewards: userBalancesToUnclaimedTokens(balances, epochConfig.finalTimestamp, "epoch1").toString(), // with 18 * 2 decimals
    }));

    const totalEmitted = usersUnclaimedRewards.reduce((a, b) => a.add(b.unclaimedRewards), BigNumber.from(0));
    console.log("Total tokens emitted:", formatUnits(totalEmitted, 18), "over", epochConfig.totalEmission.toString());
    expectBNApproxEquals(totalEmitted, epochConfig.totalEmission.mul(WAD), 1e9); // 8 over 18 decimals
  });
  it("Should should compute the correct root", async () => {
    const usersUnclaimedRewards = usersBalances
      .map(({ address, balances }) => ({
        address,
        unclaimedRewards: userBalancesToUnclaimedTokens(balances, epochConfig.finalTimestamp, "epoch1").toString(), // with 18 * 2 decimals
      }))
      // remove users with 0 MORPHO to claim
      .filter((b) => b.unclaimedRewards !== "0");
    const { root } = computeMerkleTree(usersUnclaimedRewards);
    expect(root).toEqual(epochOneRoot);
  });
});
export const expectBNApproxEquals = (bn1: BigNumber, bn2: BigNumber, precision: BigNumberish) => {
  const diff = bn1.gt(bn2) ? bn1.sub(bn2) : bn2.sub(bn1);
  expect(diff.lte(precision)).toEqual(true);
};
