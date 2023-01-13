import * as dotenv from "dotenv";
import { ethers } from "ethers";
import { getEpochFromId } from "../utils/timestampToEpoch";
import { computeMerkleTree, fetchUsers, getAccumulatedEmission, userBalancesToUnclaimedTokens } from "../utils";
import { commify, formatUnits } from "ethers/lib/utils";
import * as fs from "fs";
import { finishedEpochs } from "../ages/ages";
import { SUBGRAPH_URL } from "../config";
dotenv.config();

enum DataProvider {
  Subgraph = "subgraph",
  RPC = "rpc",
}

const computeUsersDistributions = async (dataProvider: DataProvider, epochId?: string) => {
  if (dataProvider === DataProvider.RPC) throw new Error("RPC not supported yet");
  if (epochId && !getEpochFromId(epochId)) throw new Error("Invalid epoch id");

  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

  const epochs = epochId ? [getEpochFromId(epochId)!] : finishedEpochs;
  if (!epochId) console.log(`${epochs.length} epochs to compute, to ${epochs[epochs.length - 1].id}`);

  const recap: any[] = []; // used to log the recap of the distribution

  // Compute emissions for each epoch synchronously for throughput reasons
  for (const epoch of epochs) {
    console.log(`Compute users distribution for ${epoch.id}`);

    const usersBalances = await fetchUsers(SUBGRAPH_URL, epoch.finalBlock);
    const usersAccumulatedRewards = (
      await Promise.all(
        usersBalances.map(async ({ address, balances }) => ({
          address,
          accumulatedRewards: await userBalancesToUnclaimedTokens(balances, epoch.finalTimestamp, provider).then((r) =>
            r.toString()
          ), // with 18 decimals
        }))
      )
    ).filter(({ accumulatedRewards }) => accumulatedRewards !== "0");

    const merkleTree = computeMerkleTree(usersAccumulatedRewards);

    await fs.promises.mkdir(`distribution/${epoch.ageConfig.ageName}/${epoch.epochName}`, { recursive: true });

    const totalEmission = getAccumulatedEmission(epoch.id);

    await fs.promises.writeFile(
      `distribution/${epoch.ageConfig.ageName}/${epoch.epochName}/usersDistribution.json`,
      JSON.stringify(
        {
          age: epoch.ageConfig.ageName,
          epoch: epoch.epochName,
          totalEmissionInitial: formatUnits(totalEmission),
          totalDistributed: formatUnits(merkleTree.total),
          distribution: usersAccumulatedRewards,
        },
        null,
        2
      )
    );
    await fs.promises.writeFile(
      `distribution/proofs/proofs-${epoch.number}.json`,
      JSON.stringify(
        {
          epoch: epoch.id,
          root: merkleTree.root,
          total: merkleTree.total,
          proofs: merkleTree.proofs,
        },
        null,
        2
      )
    );
    recap.push({
      age: epoch.age,
      epoch: epoch.epochName,
      users: usersAccumulatedRewards.length,
      root: merkleTree.root,
      totalEmission: commify(formatUnits(totalEmission)),
      total: commify(formatUnits(merkleTree.total)),
    });
  }
  console.table(recap);
};

const epochIdIndex = process.argv.indexOf("--epoch");
let epochId = undefined;
if (epochIdIndex !== -1) epochId = process.argv[epochIdIndex + 1];

const dataProviderIndex = process.argv.indexOf("--dataProvider");
let dataProvider = DataProvider.Subgraph;
if (dataProviderIndex !== -1) dataProvider = process.argv[dataProviderIndex + 1] as DataProvider;
if ([DataProvider.Subgraph, DataProvider.RPC].indexOf(dataProvider) === -1) throw new Error("Invalid data provider");

computeUsersDistributions(DataProvider.Subgraph, epochId).then(() => console.log("Done"));
