import { getGraphTransactions } from "../src/utils/graph/getGraphTransactions/getGraphTransactions";
import configuration from "../src/ages/age-one/configuration";
import { providers } from "ethers";
import * as dotenv from "dotenv";
import { getChainTransactions } from "../src/utils/chain/getChainTransactions";
dotenv.config();
jest.setTimeout(300_000);
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
  it("Should have handled all the transactions of the epoch two", async () => {
    const graphTransactions = await getGraphTransactions(
      graphUrl,
      ageOneConfig.epochs.epoch2.initialTimestamp,
      ageOneConfig.epochs.epoch2.finalTimestamp,
    );

    const chainTransactions = await getChainTransactions(
      provider,
      ageOneConfig.epochs.epoch2.initialBlock,
      ageOneConfig.epochs.epoch2.finalBlock,
    );
    let hasError = false;
    chainTransactions.forEach((chainTx) => {
      const graphTx = graphTransactions.find(
        (t) => t.hash.toLowerCase() === chainTx.hash.toLowerCase() && t.logIndex === chainTx.logIndex.toString(),
      );
      if (!graphTx?.id) {
        console.log(graphTx);
        hasError = true;
      }
    });
    expect(hasError).toBeFalsy();
    expect(graphTransactions.length).toEqual(chainTransactions.length);
  });
  it("Should have handled all the transactions of the epoch three", async () => {
    const graphTransactions = await getGraphTransactions(
      graphUrl,
      ageOneConfig.epochs.epoch3.initialTimestamp,
      ageOneConfig.epochs.epoch3.finalTimestamp,
    );
    console.log("fetched graph", graphTransactions.length);
    const currentBlock = await provider.getBlock("latest");
    const chainTransactions = await getChainTransactions(
      provider,
      ageOneConfig.epochs.epoch3.initialBlock,
      currentBlock.timestamp,
    );
    let hasError = false;
    chainTransactions.forEach((chainTx) => {
      const graphTx = graphTransactions.find(
        (t) => t.hash.toLowerCase() === chainTx.hash.toLowerCase() && t.logIndex === chainTx.logIndex.toString(),
      );
      if (!graphTx?.id) {
        console.log(graphTx);
        hasError = true;
      }
    });
    expect(hasError).toBeFalsy();
    expect(graphTransactions.length).toEqual(chainTransactions.length);
  });
});
