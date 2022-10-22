import { getMarketsDistribution } from "../src/utils/getEpochMarketsDistribution";
import { providers } from "ethers";
import { now } from "../src/helpers";
describe("Markets distribution", () => {
  it("Should retrieve the latest market distribution", async () => {
    const marketDistribution = await getMarketsDistribution();
    expect(marketDistribution).not.toBeUndefined();
  });
  it("Should retrieve the latest market distribution at one given block", async () => {
    const provider = await providers.getDefaultProvider();
    const marketDistribution = await getMarketsDistribution(now(), provider);
    expect(marketDistribution).not.toBeUndefined();
  });
});
