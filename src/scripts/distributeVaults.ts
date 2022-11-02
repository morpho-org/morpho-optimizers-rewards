/* eslint-disable no-console */

import * as dotenv from "dotenv";
import { providers } from "ethers";
import { isAddress } from "ethers/lib/utils";
import { distributeVaults } from "../vaults";

dotenv.config();
const RPC = process.env.RPC_URL;
if (!RPC) throw Error("RPC_URL environement variable required");
const provider = new providers.JsonRpcProvider(RPC);

const address = process.argv[2];
if (!address || !isAddress(address)) throw Error("First argument must be a valid address");

if (!process.argv[3]) throw Error("Second argument must be the deployment block of the vault");
const deploymentBlock = parseInt(process.argv[3]);
if (isNaN(deploymentBlock)) throw Error("Invalid deployment block number");

distributeVaults({
  address,
  provider,
  deploymentBlock,
})
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
