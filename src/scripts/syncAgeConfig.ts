/* eslint-disable no-console */
import { ages } from "../ages";
import { now } from "../helpers";
import { blockFromTimestamp } from "../utils";

import "dotenv/config";

const apiKey = process.env.ETHERSCAN_API_KEY!;

export const syncAgeConfig = async () => {
  const changes: {
    epochNumber: number;
    variable: string;
    value: string;
  }[] = [];

  const currentTimestamp = now();
  await Promise.all(
    ages.map(async (age) => ({
      ...age,
      epochs: await Promise.all(
        age.epochs.map(async (epoch, index) => {
          // Workaround rate limits of Etherscan
          await new Promise((r) => setTimeout(r, index * 1000));
          if (epoch.initialTimestamp.lt(currentTimestamp) && !(epoch.initialBlock && epoch.snapshotBlock)) {
            if (!epoch.initialBlock) {
              const block = await blockFromTimestamp(epoch.initialTimestamp, "after", apiKey);
              changes.push({
                epochNumber: epoch.number,
                variable: "initialBlock",
                value: block,
              });
              console.log("Initial block of epoch", epoch.number, "is", block);
            }
            if (!epoch.snapshotBlock) {
              const block = await blockFromTimestamp(epoch.initialTimestamp.sub(3600), "after", apiKey);
              changes.push({
                epochNumber: epoch.number,
                variable: "snapshotBlock",
                value: block,
              });
              console.log("Snapshot block of epoch", epoch.number, "must be", block);
            }
          }
          if (!epoch.finalBlock && epoch.finalTimestamp.lt(currentTimestamp)) {
            const block = await blockFromTimestamp(epoch.finalTimestamp, "before", apiKey);
            changes.push({
              epochNumber: epoch.number,
              variable: "finalBlock",
              value: block,
            });
            console.log("Final block of epoch", epoch.number, "is", block);
          }
        })
      ),
    }))
  );
  return changes;
};

if (process.argv.some((str) => str.includes("syncAgeConfig"))) {
  syncAgeConfig()
    .then(console.log)
    .catch((e) => {
      console.error(e);
      process.exit();
    });
}
