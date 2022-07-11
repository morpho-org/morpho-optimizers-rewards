import { fetchUsers } from "../../src/subgraph/fetch";
import { userBalancesToUnclaimedTokens } from "../../src/ages/age-one/getUserUnclaimedTokens";
import { BigNumber, BigNumberish } from "ethers";
import configuration from "../../src/ages/age-one/configuration";
import { formatUnits } from "ethers/lib/utils";
import { WAD } from "../../src/helpers/constants";

describe("Test the distribution for the first epoch", () => {
  const epochConfig = configuration.epochs.epoch1;
  it("Should distribute the correct number of tokens over Morpho users", async () => {
    const usersBalances = await fetchUsers(epochConfig.subgraphUrl);

    const usersUnclaimedRewards = usersBalances.map(({ address, balances }) => ({
      address,
      unclaimedRewards: userBalancesToUnclaimedTokens(balances, epochConfig.finalTimestamp).toString(), // with 18 * 2 decimals
    }));

    const totalEmitted = usersUnclaimedRewards.reduce((a, b) => a.add(b.unclaimedRewards), BigNumber.from(0));
    console.log("Total tokens emitted:", formatUnits(totalEmitted, 18), "over", epochConfig.totalEmission.toString());
    expectBNApproxEquals(totalEmitted, epochConfig.totalEmission.mul(WAD), 1e8); // 8 over 18 decimals
  });
});
export const expectBNApproxEquals = (bn1: BigNumber, bn2: BigNumber, precision: BigNumberish) => {
  const diff = bn1.gt(bn2) ? bn1.sub(bn2) : bn2.sub(bn1);
  expect(diff.lte(precision)).toEqual(true);
};
