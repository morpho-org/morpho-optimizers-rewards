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
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { DAO_SAFE_ADDRESS, VAULTS_REWARDS_DISTRIBUTOR } from "../constants";
import { RewardsDistributor__factory } from "@morpho-labs/morpho-ethers-contract";
import { TxBuilder } from "@morpho-labs/gnosis-tx-builder";
dotenv.config();

const baseDir = "./distribution/vaults";

const distribute = async (
  vaults: VaultConfiguration[],
  epochTo?: string,
  uploadHistory = false,
  mergeTrees = false,
  createBatch = false
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

    const lastProof = getAllProofs()[0];
    const epoch = lastProof.epoch;

    const filename = `${baseDir}/${epoch}-merged.json`;
    console.log(`Saving proof for ${filename}`);

    await fs.promises.writeFile(
      filename,
      JSON.stringify({ epoch, vaults: vaults.map((v) => v.address), ...mergedTree }, null, 2)
    );
    if (createBatch) {
      // create the batch file for gnosis
      await fs.promises.mkdir(`${baseDir}/batch`, { recursive: true });
      const batchFilename = `${baseDir}/batch/${epoch}-batch.json`;
      const txs = trees.flatMap((tree, i) => {
        const vaultAddress = vaults[i].address;

        const vaultProof = lastProof.proofs[vaultAddress]!;
        const { address } = vaults[i];

        return [
          // Claim on the main Rewards Distributor on behalf of the Vault
          {
            to: addresses.morphoDao.rewardsDistributor,
            value: "0",
            data: RewardsDistributor__factory.createInterface().encodeFunctionData("claim", [
              vaultAddress,
              vaultProof.amount,
              vaultProof.proof,
            ]),
          },
          // Transfer the claimed tokens to the Vaults Rewards Distributor
          {
            to: address,
            value: "0",
            data: ERC4626__factory.createInterface().encodeFunctionData("transferTokens", [
              addresses.morphoDao.morphoToken,
              VAULTS_REWARDS_DISTRIBUTOR,
              tree.total,
            ]),
          },
        ];
      });

      // Update the root for the vaults rewards distributor
      txs.push({
        to: VAULTS_REWARDS_DISTRIBUTOR,
        value: "0",
        data: RewardsDistributor__factory.createInterface().encodeFunctionData("updateRoot", [mergedTree.root]),
      });

      const batch = TxBuilder.batch(DAO_SAFE_ADDRESS, txs);

      await fs.promises.writeFile(batchFilename, JSON.stringify(batch, null, 2));
      console.log(`Saved batch file to ${batchFilename}`);
    }
  }
  console.table(recap);
};

distribute(
  configuration.vaults,
  configuration.epochTo,
  process.argv.includes("--save-history"),
  process.argv.includes("--merge-trees"),
  process.argv.includes("--create-batch")
)
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
