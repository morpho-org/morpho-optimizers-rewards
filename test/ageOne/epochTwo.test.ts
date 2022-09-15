import { fetchUsers } from "../../src/utils/graph/getGraphBalances/fetch";
import { userBalancesToUnclaimedTokens } from "../../src/utils/getUserUnclaimedTokens";
import { BigNumber } from "ethers";
import configuration from "../../src/ages/age-one/configuration";
import { formatUnits } from "ethers/lib/utils";
import { WAD } from "../../src/helpers/constants";
import { expectBNApproxEquals } from "./epochOne.test";
import { UserBalances } from "../../src/utils/graph/getGraphBalances";
import { computeMerkleTree } from "../../src/utils/merkleTree";

describe("Test the distribution for the second epoch", () => {
  const epochConfig = configuration.epochs.epoch2;
  let usersBalances: UserBalances[];
  const epochOneRoot = "0x1a23db78755a76f8213b5790c3e8bef2ad322bc53d40d9e7e9c1b047638a9166";
  beforeAll(async () => {
    usersBalances = await fetchUsers(configuration.subgraphUrl, epochConfig.finalBlock);
  });
  it("Should distribute the correct number of tokens over Morpho users", async () => {
    const usersAccumulatedRewards = usersBalances.map(({ address, balances }) => ({
      address,
      accumulatedRewards: userBalancesToUnclaimedTokens(
        address,
        balances,
        epochConfig.finalTimestamp,
        "epoch2",
      ).toString(), // with 18 * 2 decimals
    }));

    const totalEmitted = usersAccumulatedRewards.reduce((a, b) => a.add(b.accumulatedRewards), BigNumber.from(0));
    const totalEmission = epochConfig.totalEmission.add(configuration.epochs.epoch1.totalEmission); // we sum the emissions
    console.log("Total tokens emitted:", formatUnits(totalEmitted, 18), "over", totalEmission.toString());
    expectBNApproxEquals(
      totalEmitted,
      totalEmission.mul(
        WAD, // convert to 18 decimals
      ),
      1e10,
    ); // 10 over 18 decimals
  });
  it("Should should compute the correct root", async () => {
    const usersAccumulatedRewards = usersBalances
      .map(({ address, balances }) => ({
        address,
        accumulatedRewards: userBalancesToUnclaimedTokens(
          address,
          balances,
          epochConfig.finalTimestamp,
          "epoch2",
        ).toString(), // with 18 * 2 decimals
      }))
      // remove users with 0 MORPHO to claim
      .filter((b) => b.accumulatedRewards !== "0");
    const { root } = computeMerkleTree(usersAccumulatedRewards);
    expect(root).toEqual(epochOneRoot);
  });
});