import { fetchUsers } from "../../src/graph/fetch";
import { userBalancesToUnclaimedTokens } from "../../src/ages/age-one/getUserUnclaimedTokens";
import { BigNumber } from "ethers";
import configuration from "../../src/ages/age-one/configuration";
import { formatUnits } from "ethers/lib/utils";
import { WAD } from "../../src/helpers/constants";
import { UserBalances } from "../../src/graph/types";
import { computeMerkleTree } from "../../src/computations/compute-merkle-tree";
import { expectBNApproxEquals } from "./epochOne.test";

describe("Test the distribution for the second epoch", () => {
  const epochConfig = configuration.epochs.epoch2;
  let usersBalances: UserBalances[];
  const epochOneRoot = ""; // TODO: compute it when epoch is done
  beforeAll(async () => {
    usersBalances = await fetchUsers(epochConfig.subgraphUrl);
  });
  it("Should distribute the correct number of tokens over Morpho users", async () => {
    const usersUnclaimedRewards = usersBalances.map(({ address, balances }) => ({
      address,
      unclaimedRewards: userBalancesToUnclaimedTokens(
        address,
        balances,
        epochConfig.finalTimestamp,
        "epoch2",
      ).toString(), // with 18 * 2 decimals
    }));

    const totalEmitted = usersUnclaimedRewards.reduce((a, b) => a.add(b.unclaimedRewards), BigNumber.from(0));
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
  // TODO: enable when epoch 2 is done
  it.skip("Should should compute the correct root", async () => {
    const usersUnclaimedRewards = usersBalances
      .map(({ address, balances }) => ({
        address,
        unclaimedRewards: userBalancesToUnclaimedTokens(
          address,
          balances,
          epochConfig.finalTimestamp,
          "epoch2",
        ).toString(), // with 18 * 2 decimals
      }))
      // remove users with 0 MORPHO to claim
      .filter((b) => b.unclaimedRewards !== "0");
    const { root } = computeMerkleTree(usersUnclaimedRewards);
    expect(root).toEqual(epochOneRoot);
  });
});
