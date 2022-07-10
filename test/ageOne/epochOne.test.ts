import { fetchUsers } from "../../src/subgraph/fetch";
import { userBalancesToUnclaimedTokens } from "../../src/ages/age-one/getUserUnclaimedTokens";
import { BigNumber } from "ethers";
import configuration from "../../src/ages/age-one/configuration";
import { formatUnits } from "ethers/lib/utils";

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

    expect(totalEmitted.sub(epochConfig.totalEmission).eq(0)).toEqual(true);
  });
});
