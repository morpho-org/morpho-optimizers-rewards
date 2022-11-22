/* eslint-disable no-console */
import {BigNumber, constants, providers} from "ethers";
import { getAllProofs } from "../utils/getCurrentOnChainDistribution";
import { getEpochFromId } from "../utils/timestampToEpoch";
import {DepositEvent, TransferEvent, WithdrawEvent} from "./contracts/ERC4626";
import { WadRayMath } from "@morpho-labs/ethers-utils/lib/maths";
import { formatUnits } from "ethers/lib/utils";
import { computeMerkleTree } from "../utils";
import * as fs from "fs";
import { UserConfig } from "./types";
import VaultEventsFetcher from "./VaultEventsFetcher";

export interface DistributeVaultsParams {
  deploymentBlock: providers.BlockTag;
  provider: providers.Provider;
  address: string;
}
export enum VaultEventType {
  Deposit = "DEPOSIT",
  Withdraw = "WITHDRAW",
  Transfer = "TRANSFER",
}

// shared storage
let marketIndex = constants.Zero;
let lastTimestamp = constants.Zero;
let totalSupply = constants.Zero;
const usersConfigs: Record<string, UserConfig | undefined> = {};

const getUserConfig = (address: string) => {
  let userConfig = usersConfigs[address.toLowerCase()];
  if (!userConfig) {
    userConfig = {
      index: BigNumber.from(marketIndex),
      balance: constants.Zero,
      morphoAccrued: constants.Zero,
    };
    usersConfigs[address.toLowerCase()] = userConfig;
  }
  return userConfig;
};



const distributeVaults = async ({ deploymentBlock, provider, address }: DistributeVaultsParams) => {
  console.time("Distribution");
  address = address.toLowerCase();
  // First check the total tokens to distribute
  const epochsProofs = getAllProofs().filter((proofs) => !!proofs.proofs[address]?.amount);
  if (!epochsProofs?.length) throw Error(`No MORPHO distributed for the vault ${address}`);


  let morphoAccumulatedFromMainDistribution = constants.Zero;
  let lastEpochDistributed = constants.Zero;
  const fetcher = new VaultEventsFetcher(address, provider, deploymentBlock);
  for (const epochProofs of epochsProofs) {
    const epochConfig = getEpochFromId(epochProofs.epoch)!;
    const totalMorphoDistributed = BigNumber.from(epochProofs.proofs[address]!.amount);
    morphoAccumulatedFromMainDistribution = morphoAccumulatedFromMainDistribution.add(totalMorphoDistributed);

    console.time(epochConfig.id);
    const [allEvents, timeFrom] = await fetcher.fetchSortedEventsForEpoch(epochConfig);

    if(timeFrom.gt(lastTimestamp))
      // initiate the lastTimestamp to the first event timestamp
      lastTimestamp = timeFrom;


    const duration = epochConfig.finalTimestamp.sub(timeFrom);
    const rate = WadRayMath.rayDiv(totalMorphoDistributed, duration);

    for (const transaction of allEvents) {
      // process event
      // we first update the global vault distribution
      const block = await provider.getBlock(transaction.event.blockNumber);
      const morphoAccrued = rate.mul(BigNumber.from(block.timestamp).sub(lastTimestamp)); // number of MORPHO accrued for all users
      marketIndex = marketIndex.add(WadRayMath.wadDiv(morphoAccrued, totalSupply)); // distribute over users
      lastTimestamp = BigNumber.from(block.timestamp);

      // and then distribute to the user(s) of the transaction
      switch (transaction.type) {
        case VaultEventType.Deposit: {
          const event = transaction.event as DepositEvent;

          const userBalance = getUserConfig(event.args.owner);
          userBalance.morphoAccrued = userBalance.morphoAccrued.add(
            WadRayMath.wadMul(marketIndex.sub(userBalance.index), userBalance.balance).div(WadRayMath.RAY)
          );
          userBalance.balance = userBalance.balance.add(event.args.shares);
          userBalance.index = BigNumber.from(marketIndex);
          totalSupply = totalSupply.add(event.args.shares);
          break;
        }
        case VaultEventType.Withdraw: {
          const event = transaction.event as WithdrawEvent;
          const userBalance = getUserConfig(event.args.caller);
          userBalance.morphoAccrued = userBalance.morphoAccrued.add(
            WadRayMath.wadMul(marketIndex.sub(userBalance.index), userBalance.balance).div(WadRayMath.RAY)
          );
          userBalance.balance = userBalance.balance.sub(event.args.shares);
          userBalance.index = BigNumber.from(marketIndex);
          totalSupply = totalSupply.sub(event.args.shares);
          break;
        }
        case VaultEventType.Transfer: {
          // accrue MORPHO for the 2 users
          const event = transaction.event as TransferEvent;
          const userFromBalance = getUserConfig(event.args.from);
          userFromBalance.morphoAccrued = userFromBalance.morphoAccrued.add(
            WadRayMath.wadMul(marketIndex.sub(userFromBalance.index), userFromBalance.balance).div(WadRayMath.RAY)
          );
          userFromBalance.balance = userFromBalance.balance.sub(event.args.value);
          userFromBalance.index = BigNumber.from(marketIndex);

          const userToBalance = getUserConfig(event.args.to);
          userToBalance.morphoAccrued = userToBalance.morphoAccrued.add(
            WadRayMath.wadMul(marketIndex.sub(userToBalance.index), userToBalance.balance).div(WadRayMath.RAY)
          );
          userToBalance.balance = userToBalance.balance.add(event.args.value);
          userToBalance.index = BigNumber.from(marketIndex);
          break;
        }
      }
    }

    // and process the end of the epoch

    const morphoAccrued = rate.mul(BigNumber.from(epochConfig.finalTimestamp).sub(lastTimestamp)); // number of MORPHO accrued for all users
    marketIndex = marketIndex.add(WadRayMath.wadDiv(morphoAccrued, totalSupply)); // distribute over users
    lastTimestamp = BigNumber.from(epochConfig.finalTimestamp);

    Object.values(usersConfigs).forEach((userConfig) => {
      if (!userConfig) return;
      userConfig.morphoAccrued = userConfig.morphoAccrued.add(
        WadRayMath.wadMul(marketIndex.sub(userConfig.index), userConfig.balance).div(WadRayMath.RAY)
      );
      userConfig.index = marketIndex;
    });

    const totalTokenEmitted = Object.values(usersConfigs).reduce((acc, user) => {
      if (!user) return acc;
      return acc.add(user.morphoAccrued);
    }, constants.Zero);
    console.timeLog(
      epochConfig.id,
      "Total token emitted overall:",
      formatUnits(totalTokenEmitted),
      "over",
      formatUnits(morphoAccumulatedFromMainDistribution)
    );

    console.timeLog(
      epochConfig.id,
      "Emitted during the current epoch: ",
      formatUnits(totalTokenEmitted.sub(lastEpochDistributed))
    );
    lastEpochDistributed = totalTokenEmitted;
    console.timeEnd(epochConfig.id);
  }

  // process of the distribution and the merkle tree
  const usersRewards = Object.entries(usersConfigs).map(([address, config]) => ({
    address,
    accumulatedRewards: config!.morphoAccrued.toString(),
  }));
  const merkleTree = computeMerkleTree(usersRewards);

  const lastEpochId = epochsProofs[epochsProofs.length - 1].epoch;
  // save merkle tree
  await fs.promises.mkdir(`distribution/vaults/${lastEpochId}`, { recursive: true });
  await fs.promises.writeFile(
    `distribution/vaults/${lastEpochId}/${address}.json`,
    JSON.stringify({ epoch: lastEpochId, ...merkleTree }, null, 4)
  );

  console.timeLog("Distribution", "Root:", merkleTree.root);

  console.timeEnd("Distribution");
};


export default distributeVaults;
