import { formatUnits } from "ethers/lib/utils";
import { fetchUsers } from "../../graph/fetch";
import * as fs from "fs";
import path from "path";
import { computeMerkleTree } from "../../computations/compute-merkle-tree";
import configuration from "./configuration";
import { getMarketsEmission } from "./getMarketsEmission";
import { userBalancesToUnclaimedTokens } from "./getUserUnclaimedTokens";
import { BigNumber } from "ethers";
import { now } from "../../helpers/time";
import epoch1UserDistribution from "../../../distribution/age1/epoch1/usersDistribution.json";
const main = async (ageName: string, _epoch: string) => {
  console.log("Compute markets parameters");
  if (!Object.keys(configuration.epochs).includes(_epoch)) throw Error("invalid epoch name");
  const epoch = _epoch as keyof typeof configuration.epochs;
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
      epoch,
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
    const ageOneMarketsFilename = `./distribution/${ageName}/${epochConfig.epochName}/marketsEmission.json`;
    const ageMarketsPath = path.dirname(ageOneMarketsFilename);
    await fs.promises.mkdir(ageMarketsPath, { recursive: true });
    await fs.promises.writeFile(ageOneMarketsFilename, emissionJson);
  } else {
    console.log(emissionJson);
  }

  console.log("duration", epochConfig.finalTimestamp.sub(epochConfig.initialTimestamp).toString());
  if (epoch === "epoch3") {
    console.log("No distribution yet for epoch 3");
    return;
  }
  console.log("Get current distribution through all users");

  /// user related ///
  console.log("Fetch Morpho users of the age");
  const endDate = configuration.epochs[epoch].finalTimestamp;
  const usersBalances = await fetchUsers(epochConfig.subgraphUrl);

  let usersUnclaimedRewards = usersBalances
    .map(({ address, balances }) => ({
      address,
      unclaimedRewards: userBalancesToUnclaimedTokens(address, balances, endDate, epoch).toString(), // with 18 * 2 decimals
    }))
    // remove users with 0 MORPHO to claim

    .filter((b) => b.unclaimedRewards !== "0");
  const totalEmitted = usersUnclaimedRewards.reduce((a, b) => a.add(b.unclaimedRewards), BigNumber.from(0));
  console.log(
    "Total tokens emitted:",
    formatUnits(totalEmitted),
    "over",
    epochConfig.totalEmission.toString(),
    "for the current epoch",
  );
  if (epoch !== "epoch1") {
    usersUnclaimedRewards = usersUnclaimedRewards.map((u) => ({
      ...u,
      unclaimedRewards: BigNumber.from(u.unclaimedRewards)
        .add(
          epoch1UserDistribution.distribution.find((userFromEpoch1) => userFromEpoch1.address === u.address)
            ?.unclaimedRewards ?? BigNumber.from(0),
        )
        .toString(), // TODO: refacto with epoch3
    }));

    const totalEmittedMultiEpoch = usersUnclaimedRewards.reduce((a, b) => a.add(b.unclaimedRewards), BigNumber.from(0));
    console.log(
      "Total tokens emitted:",
      formatUnits(totalEmittedMultiEpoch),
      "over",
      epochConfig.totalEmission.add(configuration.epochs["epoch1"].totalEmission).toString(),
    ); // TODO: refacto with epoch3
  }
  const jsonUnclaimed = JSON.stringify(
    {
      date: endDate.toString(),
      epoch,
      distribution: usersUnclaimedRewards,
    },
    null,
    2,
  );

  if (process.env.SAVE_FILE) {
    // save the age into a file
    const ageOneFilename = `./distribution/${ageName}/${epoch}/usersDistribution.json`;
    const agePath = path.dirname(ageOneFilename);
    await fs.promises.mkdir(agePath, { recursive: true });
    await fs.promises.writeFile(ageOneFilename, jsonUnclaimed);
  } else {
    console.log(jsonUnclaimed);
  }

  console.log("Compute the current merkle Tree");
  if (now() < epochConfig.finalTimestamp.toNumber())
    console.log("This is not the final Merkle tree, because the distribution is not finished yet");
  const { root, proofs } = computeMerkleTree(usersUnclaimedRewards);
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
