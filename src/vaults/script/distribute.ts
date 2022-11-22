import { providers } from "ethers";
import configuration, { VaultConfiguration } from "./configuration";
import { ERC4626__factory } from "../contracts";
import VaultEventsFetcher from "../VaultEventsFetcher";
import ProofsFetcher from "../ProofsFetcher";
import Distributor from "../Distributor";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();
const distribute = async (vaults: VaultConfiguration[], epochTo?: string) => {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    console.error("Please set RPC_URL env variable");
    process.exit(1);
  }
  const provider = new providers.JsonRpcProvider(rpcUrl);
  for (const { address, deploymentBlock } of vaults) {
    const vault = ERC4626__factory.connect(address, provider);
    const symbol = await vault.symbol();
    console.log(`Distributing for vault ${address} (${symbol}) deployed at block ${deploymentBlock}`);
    const fetcher = new VaultEventsFetcher(address, provider, deploymentBlock);
    const proofsFetcher = new ProofsFetcher();
    const distributor = new Distributor(address, fetcher, proofsFetcher);
    const { history } = await distributor.distributeMorpho(epochTo);
    console.log(`Distributed ${history.length} epochs`);
    const proofsDir = `./distribution/vault/${address}-${symbol}`;
    await fs.promises.mkdir(proofsDir, { recursive: true });
    await Promise.all(
      Object.entries(history).map(async ([epochId, merkleTree]) => {
        const filename = `${proofsDir}/${epochId}.json`;
        console.log(`Saving proof for ${epochId} to ${filename}`);
        await fs.promises.writeFile(filename, JSON.stringify(merkleTree, null, 4));
      })
    );
    console.log(`Done distributing for vault ${address} (${symbol})`);
  }
};

distribute(configuration.vaults, configuration.epochTo)
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
