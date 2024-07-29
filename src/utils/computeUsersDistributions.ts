import { BigNumber, ethers, providers } from "ethers";
import { MulticallWrapper } from "ethers-multicall-provider";
import { commify, formatUnits, parseUnits } from "ethers/lib/utils";

import { epochUtils } from "../ages";
import { allEpochs } from "../ages/ageEpochConfig";
import { SUBGRAPH_URL } from "../config";

import { computeMerkleTree, fetchUsers, getAccumulatedEmission, userBalancesToUnclaimedTokens, sumRewards } from ".";
import { StorageService } from "./StorageService";

export enum DataProvider {
  Subgraph = "subgraph",
  RPC = "rpc",
}

export const computeUsersDistributionsForEpoch = async (
  epoch: epochUtils.ParsedAgeEpochConfig,
  provider: providers.BaseProvider,
  storageService: StorageService,
  force?: boolean
) => {
  console.log(`Compute users distribution for ${epoch.id}`);
  if (!epoch.finalBlock) throw new Error(`Final block not found for ${epoch.id}`);
  const usersBalances = await fetchUsers(SUBGRAPH_URL(), epoch.finalBlock);
  const marketsRewards: Record<
    string,
    {
      accumulatedSupply: BigNumber;
      accumulatedBorrow: BigNumber;
    }
  > = {};
  const usersAccumulatedRewards = (
    await Promise.all(
      usersBalances.map(async ({ address, balances }) => {
        const userPerMarkets = await userBalancesToUnclaimedTokens(
          balances,
          epoch.finalTimestamp,
          provider,
          storageService
        );
        userPerMarkets.forEach(({ market: { address }, accumulatedSupply, accumulatedBorrow }) => {
          if (!marketsRewards[address])
            marketsRewards[address] = { accumulatedSupply: BigNumber.from(0), accumulatedBorrow: BigNumber.from(0) };
          marketsRewards[address].accumulatedSupply = marketsRewards[address].accumulatedSupply.add(accumulatedSupply);
          marketsRewards[address].accumulatedBorrow = marketsRewards[address].accumulatedBorrow.add(accumulatedBorrow);
        });
        return {
          address,
          accumulatedRewards: sumRewards(userPerMarkets).toString(),
        };
      })
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
    marketsRewards,
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
  if (epochId && !epochUtils.epochNames.includes(epochId)) throw new Error("Invalid epoch id");

  const provider = MulticallWrapper.wrap(new ethers.providers.JsonRpcProvider(process.env.RPC_URL));

  const epochs = epochId ? [await epochUtils.getEpoch(epochId)] : await epochUtils.finishedEpochs();
  if (!epochId) console.log(`${epochs.length} epochs to compute, to epoch ${epochs[epochs.length - 1].id}`);

  const recap: any[] = []; // used to log the recap of the distribution

  // Compute emissions for each epoch synchronously for throughput reasons
  for (const epoch of epochs) {
    const { epochId, nbUsers, totalEmission, merkleTree, marketsRewards } = await computeUsersDistributionsForEpoch(
      epoch,
      provider,
      storageService,
      force
    );
    const allEpochsBefore = (await allEpochs()).filter((e) => e.finalTimestamp <= epoch.finalTimestamp);
    const marketDistributionPerEpoch = await Promise.all(
      allEpochsBefore.map((e) => storageService.readMarketDistribution(e.id))
    );
    const marketAccumulatedDistribution = Object.values(marketDistributionPerEpoch).reduce((acc, cur) => {
      Object.entries(cur!.markets).forEach(([address, { morphoEmittedSupplySide, morphoEmittedBorrowSide }]) => {
        if (!acc[address])
          acc[address] = { morphoEmittedSupplySide: BigNumber.from(0), morphoEmittedBorrowSide: BigNumber.from(0) };
        acc[address].morphoEmittedSupplySide = acc[address].morphoEmittedSupplySide.add(
          parseUnits(morphoEmittedSupplySide)
        );
        acc[address].morphoEmittedBorrowSide = acc[address].morphoEmittedBorrowSide.add(
          parseUnits(morphoEmittedBorrowSide)
        );
      });
      return acc;
    }, {} as Record<string, { morphoEmittedSupplySide: BigNumber; morphoEmittedBorrowSide: BigNumber }>);

    const perMarketsDistribution = Object.entries(marketsRewards).map(
      ([address, { accumulatedSupply, accumulatedBorrow }]) => {
        return {
          epochId,
          address,
          accumulatedSupply: formatUnits(accumulatedSupply),
          estimatedAccumulatedSupply: formatUnits(
            marketAccumulatedDistribution[address.toLowerCase()]?.morphoEmittedSupplySide ?? "0"
          ),
          diffAccumulatedSupply: formatUnits(
            BigNumber.from(marketAccumulatedDistribution[address.toLowerCase()]?.morphoEmittedSupplySide ?? "0").sub(
              accumulatedSupply
            )
          ),
          accumulatedBorrow: formatUnits(accumulatedBorrow),
          estimatedAccumulatedBorrow: formatUnits(
            marketAccumulatedDistribution[address.toLowerCase()]?.morphoEmittedBorrowSide ?? "0"
          ),
          diffAccumulatedBorrow: formatUnits(
            BigNumber.from(marketAccumulatedDistribution[address.toLowerCase()]?.morphoEmittedBorrowSide ?? "0").sub(
              accumulatedBorrow
            )
          ),
        };
      }
    );
    console.table(perMarketsDistribution);

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
