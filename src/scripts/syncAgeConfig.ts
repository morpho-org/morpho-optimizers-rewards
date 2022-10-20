/* eslint-disable no-console */

import { ages } from "../ages";
import { now } from "../helpers";
import { blockFromTimestamp } from "../utils";

import * as dotenv from "dotenv";

dotenv.config();
const syncAgeConfig = async () => {
  const changes: {
    epoch: string;
    variable: string;
    value: string;
  }[] = [];

  const currentTimestamp = now();
  await Promise.all(
    ages.map(async (age) => ({
      ...age,
      epochs: await Promise.all(
        age.epochs.map(async (epoch) => {
          if (epoch.initialTimestamp.lt(currentTimestamp) && !(epoch.initialBlock && epoch.snapshotBlock)) {
            const block = await blockFromTimestamp(epoch.initialTimestamp, "after", process.env.ETHERSCAN_API_KEY!);
            if (!epoch.initialBlock) {
              changes.push({
                epoch: epoch.id,
                variable: "initialBlock",
                value: block,
              });
              console.log("Initial block of epoch", epoch.id, "is", block);
            }
            if (!epoch.snapshotBlock) {
              changes.push({
                epoch: epoch.id,
                variable: "snapshotBlock",
                value: block,
              });
              console.log("Snapshot block of epoch", epoch.id, "must be", block);
            }
          }
          if (!epoch.finalBlock && epoch.finalTimestamp.lt(currentTimestamp)) {
            const block = await blockFromTimestamp(epoch.finalTimestamp, "before", process.env.ETHERSCAN_API_KEY!);
            changes.push({
              epoch: epoch.id,
              variable: "finalBlock",
              value: block,
            });
            console.log("Final block of epoch", epoch.id, "is", block);
          }
        })
      ),
    }))
  );
  return changes;
};

syncAgeConfig()
  .then(console.log)
  .catch((e) => {
    console.error(e);
    process.exit();
  });
