import { ethers, providers } from "ethers";
import { computeMerkleTree, fetchUsers, getAccumulatedEmission, userBalancesToUnclaimedTokens, sumRewards } from ".";
import { commify, formatUnits } from "ethers/lib/utils";
import { epochNames, finishedEpochs, getEpoch, ParsedAgeEpochConfig } from "../ages";
import { SUBGRAPH_URL } from "../config";
import { StorageService } from "./StorageService";

export enum DataProvider {
  Subgraph = "subgraph",
  RPC = "rpc",
}

export const computeUsersDistributionsForEpoch = async (
  epoch: ParsedAgeEpochConfig,
  provider: providers.BaseProvider,
  storageService: StorageService,
  force?: boolean
) => {
  console.log(`Compute users distribution for ${epoch.id}`);
  if (!epoch.finalBlock) throw new Error(`Final block not found for ${epoch.id}`);

  const usersBalances = await fetchUsers(SUBGRAPH_URL, epoch.finalBlock);
  const usersAccumulatedRewards = (
    await Promise.all(
      usersBalances.map(async ({ address, balances }) => ({
        address,
        accumulatedRewards: sumRewards(
          await userBalancesToUnclaimedTokens(balances, epoch.finalTimestamp, provider, storageService)
        ).toString(),
      }))
    )
  ).filter(({ accumulatedRewards }) => accumulatedRewards !== "0");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { leaves, ...merkleTree } = computeMerkleTree(usersAccumulatedRewards);

  const totalEmission = getAccumulatedEmission(epoch.id);

  await storageService.writeUsersDistribution(
    epoch.id,
    {
      epochId: epoch.id,
      totalEmissionInitial: formatUnits(totalEmission),
      totalDistributed: formatUnits(merkleTree.total),
      distribution: usersAccumulatedRewards,
    },
    force
  );

  await storageService.writeProofs(epoch.id, { epochId: epoch.id, ...merkleTree }, force);
  return {
    epochId: epoch.id,
    nbUsers: usersAccumulatedRewards.length,
    totalEmission,
    merkleTree,
  };
};

export const computeUsersDistributions = async (
  dataProvider: DataProvider,
  storageService: StorageService,
  epochId?: string,
  force?: boolean
) => {
  if (dataProvider === DataProvider.RPC) throw new Error("RPC not supported yet");
  if (epochId && !epochNames.includes(epochId)) throw new Error("Invalid epoch id");

  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

  const epochs = epochId ? [await getEpoch(epochId)] : await finishedEpochs();
  if (!epochId) console.log(`${epochs.length} epochs to compute, to epoch ${epochs[epochs.length - 1].id}`);

  const recap: any[] = []; // used to log the recap of the distribution

  // Compute emissions for each epoch synchronously for throughput reasons
  for (const epoch of epochs) {
    const { epochId, nbUsers, totalEmission, merkleTree } = await computeUsersDistributionsForEpoch(
      epoch,
      provider,
      storageService,
      force
    );

    recap.push({
      epochId,
      users: nbUsers,
      root: merkleTree.root,
      totalEmission: commify(formatUnits(totalEmission)),
      total: commify(formatUnits(merkleTree.total)),
    });
  }

  console.table(recap);
  return epochs.map((epoch) => epoch.id);
};
