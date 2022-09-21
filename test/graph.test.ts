/* eslint-disable no-console */

import { getChainTransactions, getGraphTransactions } from "../src/utils";
import { providers } from "ethers";
import * as dotenv from "dotenv";
import { ages } from "../src";
dotenv.config();
jest.setTimeout(300_000);

const rpcUrl = process.env.RPC_URL;

// run only locally to be sure of the sync of the graph without slow down the CI
describe.skip("Test the current state of the subgraph for age one", () => {
  const ageOneConfig = ages[0];
  const graphUrl = "https://api.thegraph.com/subgraphs/name/morpho-dev/morpho-rewards-staging";
  const provider = new providers.JsonRpcProvider(rpcUrl);
  it("Should have handled all the transactions of the epoch one", async () => {
    const epochOneGraphTransactions = await getGraphTransactions(
      graphUrl,
      ageOneConfig.epochs[0].initialTimestamp,
      ageOneConfig.epochs[0].finalTimestamp
    );

    const epochOneChainTransactions = await getChainTransactions(
      provider!,
      ageOneConfig.epochs[0].initialBlock!,
      ageOneConfig.epochs[0].finalBlock!
    );
    let hasError = false;
    epochOneChainTransactions.forEach((chainTx) => {
      const graphTx = epochOneGraphTransactions.find(
        (t) => t.hash.toLowerCase() === chainTx.hash.toLowerCase() && t.logIndex === chainTx.logIndex.toString()
      );
      if (!graphTx?.id) {
        console.log(graphTx, chainTx);
        hasError = true;
      }
    });
    expect(hasError).toBeFalsy();
    expect(epochOneGraphTransactions.length).toEqual(epochOneChainTransactions.length);
  });
  it("Should have handled all the transactions of the epoch two", async () => {
    const graphTransactions = await getGraphTransactions(
      graphUrl,
      ageOneConfig.epochs[1].initialTimestamp,
      ageOneConfig.epochs[1].finalTimestamp
    );

    const chainTransactions = await getChainTransactions(
      provider,
      ageOneConfig.epochs[1].initialBlock!,
      ageOneConfig.epochs[1].finalBlock!
    );
    let hasError = false;
    chainTransactions.forEach((chainTx) => {
      const graphTx = graphTransactions.find(
        (t) => t.hash.toLowerCase() === chainTx.hash.toLowerCase() && t.logIndex === chainTx.logIndex.toString()
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
      ageOneConfig.epochs[2].initialTimestamp,
      ageOneConfig.epochs[2].finalTimestamp
    );
    console.log("fetched graph", graphTransactions.length);
    const chainTransactions = await getChainTransactions(
      provider,
      ageOneConfig.epochs[2].initialBlock!,
      ageOneConfig.epochs[2].finalBlock!
    );
    let hasError = 0;
    console.log("fetched chain", chainTransactions.length);
    chainTransactions.forEach((chainTx) => {
      const graphTx = graphTransactions.find(
        (t) => t.hash.toLowerCase() === chainTx.hash.toLowerCase() && t.logIndex === chainTx.logIndex.toString()
      );
      if (!graphTx?.id) {
        console.log(graphTx, chainTx);
        hasError++;
      }
    });
    expect(hasError).toBeFalsy();
    expect(graphTransactions.length).toEqual(chainTransactions.length);
  });
});
