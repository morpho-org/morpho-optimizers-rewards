/* eslint-disable no-console */
import { getMarketsDistribution } from "../utils/getEpochMarketsDistribution";

getMarketsDistribution(process.argv[3] ? +process.argv[3] : undefined)
  .then(console.log)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
