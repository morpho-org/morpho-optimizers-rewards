import { formatUnits } from "ethers/lib/utils";
import { fetchUsers } from "../../subgraph/fetch";
import * as fs from "fs";
import path from "path";
import { computeMerkleTree } from "../../computations/compute-merkle-tree";
import configuration from "./configuration";
import { getMarketsEmission } from "./getMarketsEmission";
import { userBalancesToUnclaimedTokens } from "./getUserUnclaimedTokens";
import { BigNumber } from "ethers";
import { now } from "../../helpers/time";

const main = async (ageName: string, epoch: keyof typeof configuration.epochs) => {
  console.log("Compute markets parameters");
  const epochConfig = configuration.epochs[epoch];

  console.log("Markets Emissions");
  const { marketsEmissions, liquidity } = await getMarketsEmission(epoch);
  const formattedMarketsEmission: {
    [market: string]: {
      supply: string;
      borrow: string;
      supplyRate: string;
      borrowRate: string;
      p2pIndexCursor: string;
    };
  } = {};
  Object.keys(marketsEmissions).forEach((m) => {
    const marketEmission = marketsEmissions[m];
    if (!marketEmission) return;
    formattedMarketsEmission[m] = {
      supply: formatUnits(marketEmission.supply),
      supplyRate: formatUnits(marketEmission.supplyRate),
      borrowRate: formatUnits(marketEmission.borrowRate),
      borrow: formatUnits(marketEmission.borrow),
      p2pIndexCursor: formatUnits(marketEmission.p2pIndexCursor, 4),
    };
  });

  // save the age into a file
  const emissionJson = JSON.stringify(
    {
      age: ageName,
      epoch: "epoch1",
      totalEmission: epochConfig.totalEmission.toString(),
      parameters: {
        initialBlock: epochConfig.initialBlock.toString(),
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
    2,
  );
  if (process.env.SAVE_FILE) {
    const ageOneMarketsFilename = `./ages/${ageName}/${epochConfig.epochName}/marketsEmission.json`;
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
  const endDate = configuration.epochs.epoch1.finalTimestamp;
  const usersBalances = await fetchUsers(epochConfig.subgraphUrl);

  const usersUnclaimedRewards = usersBalances.map(({ address, balances }) => ({
    address,
    unclaimedRewards: userBalancesToUnclaimedTokens(balances, endDate).toString(), // with 18 * 2 decimals
  }));

  const totalEmitted = usersUnclaimedRewards.reduce((a, b) => a.add(b.unclaimedRewards), BigNumber.from(0));
  console.log("Total tokens emitted:", formatUnits(totalEmitted, 36), "over", epochConfig.totalEmission.toString());
  return;
  const jsonUnclaimed = JSON.stringify(
    {
      date: endDate,
      epoch,
      distribution: usersUnclaimedRewards,
    },
    null,
    2,
  );
  if (process.env.SAVE_FILE) {
    // save the age into a file
    const ageOneFilename = `./ages/${ageName}/${epoch}/distribution.json`;
    const agePath = path.dirname(ageOneFilename);
    await fs.promises.mkdir(agePath, { recursive: true });
    await fs.promises.writeFile(ageOneFilename, JSON.stringify(jsonUnclaimed, null, 2));
  } else {
    console.log(jsonUnclaimed);
  }

  console.log("Compute the current merkle Tree");
  if (now() < epochConfig.finalTimestamp.toNumber()) console.log("This is not the final Merkle tree");
  const { root, proofs } = computeMerkleTree(usersUnclaimedRewards);

  // save the age proofs into a file
  const ageOneProofsFilename = `./ages/${ageName}/${epochConfig.epochName}/proofs.json`;
  const ageProofsPath = path.dirname(ageOneProofsFilename);
  await fs.promises.mkdir(ageProofsPath, { recursive: true });
  await fs.promises.writeFile(ageOneProofsFilename, JSON.stringify({ root, proofs }, null, 2));
};

main("age1", "epoch1").catch((e) => {
  console.error(e);
  process.exit(1);
});
