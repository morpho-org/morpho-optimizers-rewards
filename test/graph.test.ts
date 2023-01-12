/* eslint-disable no-console */

import { getChainTransactions, getGraphTransactions } from "../src/utils";
import { providers } from "ethers";
import * as dotenv from "dotenv";
import { ages } from "../src";
import { now } from "../src/helpers";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { SUBGRAPH_URL } from "../src/config";
dotenv.config();
jest.setTimeout(300_000);

const rpcUrl = process.env.RPC_URL;

// run only locally to be sure of the sync of the graph without slow down the CI
describe.skip.each(ages)("Test the current state of the subgraph", (age) => {
  const provider = new providers.JsonRpcProvider(rpcUrl);

  describe.each(age.epochs)(`Test subgraph for all epochs of ${age.ageName}`, (epoch) => {
    if (epoch.finalTimestamp.gt(now())) return;

    it(`Should have handled all the transactions of the epoch ${epoch.id} for Morpho Aave`, async () => {
      const MORPHO_AAVE_DEPLOYMENT_BLOCK = 15383036;
      if (epoch.finalBlock! < MORPHO_AAVE_DEPLOYMENT_BLOCK) return;
      const graphTransactions = await getGraphTransactions(
        SUBGRAPH_URL,
        epoch.initialTimestamp,
        epoch.finalTimestamp,
        addresses.morphoAave.morpho.toLowerCase()
      );

      const initialBlock = Math.max(epoch.initialBlock!, MORPHO_AAVE_DEPLOYMENT_BLOCK);
      const chainTransactions = await getChainTransactions(
        provider!,
        initialBlock,
        epoch.finalBlock!,
        addresses.morphoAave.morpho.toLowerCase()
      );
      let hasError = false;
      chainTransactions.forEach((chainTx) => {
        const graphTx = graphTransactions.find(
          (t) => t.hash.toLowerCase() === chainTx.hash.toLowerCase() && t.logIndex === chainTx.logIndex.toString()
        );
        if (!graphTx?.id) {
          console.log(graphTx, chainTx);
          hasError = true;
        }
      });
      expect(hasError).toBeFalsy();
      expect(graphTransactions.length).toEqual(chainTransactions.length);
    });
    it(`Should have handled all the transactions of the epoch ${epoch.id} for Morpho Compound`, async () => {
      const graphTransactions = await getGraphTransactions(
        SUBGRAPH_URL,
        epoch.initialTimestamp,
        epoch.finalTimestamp,
        addresses.morphoCompound.morpho.toLowerCase()
      );

      const chainTransactions = await getChainTransactions(
        provider!,
        epoch.initialBlock!,
        epoch.finalBlock!,
        addresses.morphoCompound.morpho.toLowerCase()
      );
      let hasError = false;
      chainTransactions.forEach((chainTx) => {
        const graphTx = graphTransactions.find(
          (t) => t.hash.toLowerCase() === chainTx.hash.toLowerCase() && t.logIndex === chainTx.logIndex.toString()
        );
        if (!graphTx?.id) {
          console.log(graphTx, chainTx);
          hasError = true;
        }
      });
      expect(hasError).toBeFalsy();
      expect(graphTransactions.length).toEqual(chainTransactions.length);
    });
  });
});
