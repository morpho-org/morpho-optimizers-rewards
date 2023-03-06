import { ethers } from "ethers";
import {
  computeMerkleTree,
  fetchUsers,
  getAccumulatedEmission,
  userBalancesToUnclaimedTokens,
  getEpochFromId,
  sumRewards,
} from ".";
import { commify, formatUnits } from "ethers/lib/utils";
import { finishedEpochs } from "../ages/ages";
import { SUBGRAPH_URL } from "../config";
import { StorageService } from "./StorageService";

export enum DataProvider {
  Subgraph = "subgraph",
  RPC = "rpc",
}

export const computeUsersDistributions = async (
  dataProvider: DataProvider,
  storageService: StorageService,
  epochId?: string,
  force?: boolean
) => {
  if (dataProvider === DataProvider.RPC) throw new Error("RPC not supported yet");
  if (epochId && !getEpochFromId(epochId)) throw new Error("Invalid epoch id");

  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

  const epochs = epochId ? [getEpochFromId(epochId)!] : finishedEpochs;
  if (!epochId) console.log(`${epochs.length} epochs to compute, to ${epochs[epochs.length - 1].id}`);

  const recap: any[] = []; // used to log the recap of the distribution

  // Compute emissions for each epoch synchronously for throughput reasons
  for (const epoch of epochs) {
    console.log(`Compute users distribution for ${epoch.id}`);

    const usersBalances = await fetchUsers(SUBGRAPH_URL, epoch.finalBlock ?? undefined);
    const usersAccumulatedRewards = (
      await Promise.all(
        usersBalances.map(async ({ address, balances }) => ({
          address,
          accumulatedRewards: sumRewards(
            await userBalancesToUnclaimedTokens(balances, epoch.finalTimestamp, provider, storageService)
          ).toString(), // with 18 decimals
        }))
      )
    ).filter(({ accumulatedRewards }) => accumulatedRewards !== "0");

    // eslint-disable-next-line
    const { leaves, ...merkleTree } = computeMerkleTree(usersAccumulatedRewards);

    const totalEmission = getAccumulatedEmission(epoch.id);

    await storageService.writeUsersDistribution(
      epoch.ageConfig.ageName,
      epoch.epochName,
      {
        age: epoch.ageConfig.ageName,
        epoch: epoch.epochName,
        totalEmissionInitial: formatUnits(totalEmission),
        totalDistributed: formatUnits(merkleTree.total),
        distribution: usersAccumulatedRewards,
      },
      force
    );
    await storageService.writeProofs(epoch.number, { epoch: epoch.id, ...merkleTree }, force);
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
  return epochs.map((epoch) => epoch.epochId);
};
