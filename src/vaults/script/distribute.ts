import { providers } from "ethers";
import configuration, { VaultConfiguration } from "./configuration";
import { ERC4626__factory } from "../contracts";
import VaultEventsFetcher from "../VaultEventsFetcher";
import ProofsFetcher from "../ProofsFetcher";
import Distributor from "../Distributor";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { Tree } from "../../utils/merkleTree/merkleTree";
import { mergeMerkleTrees } from "../../utils/merkleTree/mergeMerkleTree";
import { getAllProofs } from "../../utils/getCurrentOnChainDistribution";
import { formatUnits } from "ethers/lib/utils";
dotenv.config();

const baseDir = "./distribution/vaults";

const distribute = async (
  vaults: VaultConfiguration[],
  epochTo?: string,
  uploadHistory = false,
  mergeTrees = false
) => {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    console.error("Please set RPC_URL env variable");
    process.exit(1);
  }
  const recap: any[] = [];
  const provider = new providers.JsonRpcProvider(rpcUrl);
  const trees: Tree[] = [];
  for (const { address, deploymentBlock } of vaults) {
    const vault = ERC4626__factory.connect(address, provider);
    const symbol = await vault.symbol();
    console.log(`Distributing for vault ${address} (${symbol}) deployed at block ${deploymentBlock}`);

    const eventsFetcher = new VaultEventsFetcher(address, provider, deploymentBlock);
    const proofsFetcher = new ProofsFetcher();
    const distributor = new Distributor(address, eventsFetcher, proofsFetcher);
    const { history, lastMerkleTree } = await distributor.distributeMorpho(epochTo);
    console.log(`Distributed ${Object.keys(history).length} epochs`);
    const proofsDir = `${baseDir}/${address}-${symbol}`;

    await fs.promises.mkdir(proofsDir, { recursive: true });
    trees.push(lastMerkleTree);
    recap.push({
      address,
      symbol,
      epochs: Object.keys(history).length,
      totalMorpho: formatUnits(lastMerkleTree.total),
      totalUsers: Object.keys(lastMerkleTree.proofs).length,
    });

    if (!mergeTrees || uploadHistory) {
      const toUpload = uploadHistory ? history : { [Object.keys(history).pop()!]: Object.values(history).pop()! };
      await Promise.all(
        Object.entries(toUpload).map(async ([epochId, merkleTree]) => {
          const filename = `${proofsDir}/${epochId}.json`;
          console.log(`Saving proof for ${epochId} to ${filename}`);
          await fs.promises.writeFile(filename, JSON.stringify({ epochId, ...merkleTree }, null, 2));
        })
      );
    }

    console.log(`Done distributing for vault ${address} (${symbol})`);
  }
  if (mergeTrees) {
    const mergedTree = mergeMerkleTrees(trees);
    const epoch = getAllProofs()[0].epoch;
    const filename = `${baseDir}/${epoch}-merged.json`;
    console.log(`Saving proof for ${filename}`);
    await fs.promises.writeFile(
      filename,
      JSON.stringify({ epoch, vaults: vaults.map((v) => v.address), ...mergedTree }, null, 2)
    );
  }
  console.table(recap);
};

distribute(
  configuration.vaults,
  configuration.epochTo,
  process.argv.includes("--save-history"),
  process.argv.includes("--merge-trees")
)
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
