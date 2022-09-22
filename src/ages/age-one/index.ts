/* eslint-disable no-console */

import { formatUnits } from "ethers/lib/utils";
import {
  fetchUsers,
  userBalancesToUnclaimedTokens,
  computeMerkleTree,
  getAccumulatedEmission,
  UserBalance,
} from "../../utils";
import * as fs from "fs";
import path from "path";
import { ageOneDistribution } from "../distributions";
import { BigNumber } from "ethers";
import { now } from "../../helpers";
import { ages } from "../ages";

const main = async (ageName: string, _epoch: string) => {
  const configuration = ages[0];
  console.log("Compute markets parameters");
  const epochConfig = configuration.epochs.find((e) => e.epochName === _epoch);
  if (!epochConfig) throw Error(`Unknown epoch ${_epoch} for age 1`);
  console.log("Markets Emissions");
  const { marketsEmissions, liquidity } = await ageOneDistribution(epochConfig);
  const formattedMarketsEmission: {
    [market: string]: {
      supply: string;
      borrow: string;
      supplyRate: string;
      borrowRate: string;
      p2pIndexCursor: string;
    };
  } = {};
  Object.keys(marketsEmissions).forEach((market) => {
    const marketEmission = marketsEmissions[market];
    if (!marketEmission) return;
    formattedMarketsEmission[market] = {
      supply: formatUnits(marketEmission.supply),
      supplyRate: marketEmission.supplyRate.toString(),
      borrowRate: marketEmission.borrowRate.toString(),
      borrow: formatUnits(marketEmission.borrow),
      p2pIndexCursor: formatUnits(marketEmission.p2pIndexCursor, 4),
    };
  });

  // save the age into a file
  const emissionJson = JSON.stringify(
    {
      age: ageName,
      epoch: epochConfig.epochName,
      totalEmission: epochConfig.totalEmission.toString(),
      parameters: {
        snapshotBlock: epochConfig.snapshotBlock?.toString(),
        initialTimestamp: epochConfig.initialTimestamp.toString(),
        totalSupply: formatUnits(liquidity.totalSupply),
        totalBorrow: formatUnits(liquidity.totalBorrow),
        total: formatUnits(liquidity.total),
        finalTimestamp: epochConfig.finalTimestamp.toString(),
        duration: epochConfig.finalTimestamp.sub(epochConfig.initialTimestamp).toString(),
      },
      markets: formattedMarketsEmission,
    },
    null,
    2
  );
  if (process.env.SAVE_FILE) {
    const ageOneMarketsFilename = `./distribution/${ageName}/${epochConfig.epochName}/marketsEmission.json`;
    const ageMarketsPath = path.dirname(ageOneMarketsFilename);
    await fs.promises.mkdir(ageMarketsPath, { recursive: true });
    await fs.promises.writeFile(ageOneMarketsFilename, emissionJson);
  } else {
    console.log(emissionJson);
  }

  console.log("duration", epochConfig.finalTimestamp.sub(epochConfig.initialTimestamp).toString());

  console.log("Get current distribution through all users");

  /// user related ///
  console.log("Fetch Morpho users of the age");
  const endDate = epochConfig.finalTimestamp;
  const usersBalances = await fetchUsers(configuration.subgraphUrl);

  const usersAccumulatedRewards = usersBalances
    .map(({ address, balances }: { address: string; balances: UserBalance[] }) => ({
      address,
      accumulatedRewards: userBalancesToUnclaimedTokens(balances, endDate).toString(), // with 18 * 2 decimals
    }))
    // remove users with 0 MORPHO to claim
    .filter((b) => b.accumulatedRewards !== "0");

  const totalEmission: BigNumber = getAccumulatedEmission(epochConfig.id);
  const totalEmitted = usersAccumulatedRewards.reduce((a, b) => a.add(b.accumulatedRewards), BigNumber.from(0));
  console.log(
    "Total tokens emitted:",
    formatUnits(totalEmitted),
    "over",
    totalEmission.toString(),
    "for the current epoch"
  );

  const jsonUnclaimed = JSON.stringify(
    {
      date: endDate.toString(),
      epoch: epochConfig.epochName,
      distribution: usersAccumulatedRewards,
    },
    null,
    2
  );

  if (process.env.SAVE_FILE) {
    // save the age into a file
    const ageOneFilename = `./distribution/${ageName}/${epochConfig.epochName}/usersDistribution.json`;
    const agePath = path.dirname(ageOneFilename);
    await fs.promises.mkdir(agePath, { recursive: true });
    await fs.promises.writeFile(ageOneFilename, jsonUnclaimed);
  } else {
    console.log(jsonUnclaimed);
  }

  console.log("Compute the current merkle Tree");
  if (now() < epochConfig.finalTimestamp.toNumber())
    console.log("This is not the final Merkle tree, because the distribution is not finished yet");
  const { root, proofs } = computeMerkleTree(usersAccumulatedRewards);
  console.log("Computed root: ", root);
  // save the age proofs into a file
  const ageOneProofsFilename = `./distribution/${ageName}/${epochConfig.epochName}/proofs.json`;
  const ageProofsPath = path.dirname(ageOneProofsFilename);
  await fs.promises.mkdir(ageProofsPath, { recursive: true });
  await fs.promises.writeFile(ageOneProofsFilename, JSON.stringify({ root, proofs }, null, 2));
};

main("age1", process.argv[2]).catch((e) => {
  console.error(e);
  process.exit(1);
});
