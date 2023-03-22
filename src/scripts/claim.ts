import { isAddress } from "ethers/lib/utils";
import { claim } from "../utils/claim";
import { providers, Wallet } from "ethers";
import { FileSystemStorageService } from "../utils/StorageService";
import * as dotenv from "dotenv";
dotenv.config();

const sk =
  process.argv.indexOf("--private-key") !== -1 ? process.argv[process.argv.indexOf("--private-key") + 1] : undefined;

if (!sk) throw Error("You must provide a private key with --private-key");

const rpcUrl =
  process.argv.indexOf("--rpc-url") !== -1 ? process.argv[process.argv.indexOf("--rpc-url") + 1] : process.env.RPC_URL;

if (!rpcUrl) throw Error("You must provide a RPC URL with --rpc-url or RPC_URL env variable");
const wallet = new Wallet(sk!, new providers.JsonRpcProvider(rpcUrl));

let addressesOnBehalf =
  process.argv.indexOf("--on-behalf") !== -1
    ? process.argv[process.argv.indexOf("--on-behalf") + 1].split(",")
    : undefined;

if (addressesOnBehalf) {
  addressesOnBehalf.forEach((address) => {
    if (!isAddress(address)) throw Error(`Invalid address ${address}`);
  });

  console.log("You are signing transactions on behalf of the following addresses: \n", addressesOnBehalf.join("\n"));
} else {
  addressesOnBehalf = [wallet.address];
}

claim(addressesOnBehalf, new FileSystemStorageService(), wallet).catch((e) => {
  console.error(e);
  process.exit(1);
});
