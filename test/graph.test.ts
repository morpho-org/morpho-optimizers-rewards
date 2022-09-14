import { getGraphTransactions } from "../src/graph/getGraphTransactions";
import configuration from "../src/ages/age-one/configuration";
import { providers } from "ethers";
import * as dotenv from "dotenv";
import { getChainTransactions } from "../src/chain/getChainTransactions";
dotenv.config();
jest.setTimeout(30_000);
describe("Test the current state of the subgraph for age one", () => {
  const ageOneConfig = configuration;
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
  const graphUrl = "https://api.thegraph.com/subgraphs/name/morpho-dev/morpho-rewards-staging";
  it("Should have handled all the transactions of the epoch one", async () => {
    const epochOneGraphTransactions = await getGraphTransactions(
      graphUrl,
      ageOneConfig.epochs.epoch1.initialTimestamp,
      ageOneConfig.epochs.epoch1.finalTimestamp,
    );

    const epochOneChainTransactions = await getChainTransactions(
      provider,
      ageOneConfig.epochs.epoch1.initialBlock,
      ageOneConfig.epochs.epoch1.finalBlock,
    );
    let hasError = false;
    epochOneChainTransactions.forEach((chainTx) => {
      const graphTx = epochOneGraphTransactions.find(
        (t) => t.hash.toLowerCase() === chainTx.hash.toLowerCase() && t.logIndex === chainTx.logIndex.toString(),
      );
      if (!graphTx?.id) {
        console.log(graphTx);
        hasError = true;
      }
    });
    expect(hasError).toBeFalsy();
    expect(epochOneGraphTransactions.length).toEqual(epochOneChainTransactions.length);
  });
});
