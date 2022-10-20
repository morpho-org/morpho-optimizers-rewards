/* eslint-disable no-console */
import { getMarketsDistribution } from "../utils/getEpochMarketsDistribution";
import * as dotenv from "dotenv";
import { providers } from "ethers";
dotenv.config();

const provider = process.env.RPC_URL
  ? new providers.JsonRpcProvider(process.env.RPC_URL)
  : new providers.InfuraProvider(1);

getMarketsDistribution(process.argv[3] ? +process.argv[3] : undefined, provider)
  .then(console.log)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
