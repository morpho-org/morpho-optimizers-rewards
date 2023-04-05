import { ethers } from "ethers";
import { computeMerkleTree, fetchUsers, getAccumulatedEmission, userBalancesToUnclaimedTokens, sumRewards } from ".";
import { commify, formatUnits } from "ethers/lib/utils";
import { finishedEpochs } from "../ages/ages";
import { SUBGRAPH_URL } from "../config";
import { StorageService } from "./StorageService";
import { getEpochFromNumber } from "./timestampToEpoch";
import { epochNumberToAgeEpochString } from "../helpers";

export enum DataProvider {
  Subgraph = "subgraph",
  RPC = "rpc",
}

export const computeUsersDistributions = async (
  dataProvider: DataProvider,
  storageService: StorageService,
  epochNumber?: number,
  force?: boolean
) => {
  if (dataProvider === DataProvider.RPC) throw new Error("RPC not supported yet");
  if (epochNumber && !getEpochFromNumber(epochNumber)) throw new Error("Invalid epoch id");

  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

  const epochs = epochNumber ? [getEpochFromNumber(epochNumber)!.epoch] : finishedEpochs.map(({ epoch }) => epoch);
  if (!epochNumber)
    console.log(`${epochs.length} epochs to compute, to epoch ${epochs[epochs.length - 1].epochNumber}`);

  const recap: any[] = []; // used to log the recap of the distribution

  // Compute emissions for each epoch synchronously for throughput reasons
  for (const epoch of epochs) {
    console.log(`Compute users distribution for epoch ${epoch.epochNumber}`);

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

    const totalEmission = getAccumulatedEmission(epoch.epochNumber);

    const { age: ageName, epoch: epochName } = epochNumberToAgeEpochString(epoch.epochNumber);

    await storageService.writeUsersDistribution(
      epoch.epochNumber,
      {
        age: ageName,
        epoch: epochName,
        epochNumber: epoch.epochNumber,
        totalEmissionInitial: formatUnits(totalEmission),
        totalDistributed: formatUnits(merkleTree.total),
        distribution: usersAccumulatedRewards,
      },
      force
    );

    await storageService.writeProofs(epoch.epochNumber, { epochNumber: epoch.epochNumber, ...merkleTree }, force);
    recap.push({
      age: ageName,
      epoch: epochName,
      epochNumber: epoch.epochNumber,
      users: usersAccumulatedRewards.length,
      root: merkleTree.root,
      totalEmission: commify(formatUnits(totalEmission)),
      total: commify(formatUnits(merkleTree.total)),
    });
  }
  console.table(recap);
  return epochs.map((epoch) => epoch.epochNumber);
};
