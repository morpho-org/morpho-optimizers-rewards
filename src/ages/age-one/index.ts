import { formatUnits } from "ethers/lib/utils";
import { fetchUsers } from "../../subgraph/fetch";
import * as fs from "fs";
import path from "path";
import { getMarketsConfiguration } from "../../markets";
import { computeMerkleTree } from "../../computations/compute-merkle-tree";
import { computeMarketsEmission } from "../../computations/compute-markets-emission";
import { computeUsersDistribution } from "../../computations/compute-users-distribution";
import configuration from "./configuration";
import { Balance, EpochConfig } from "../../types";

const main = async (ageName: string, configuration: EpochConfig) => {
  console.log("Compute markets parameters");
  const ageOneMarketsParameters = await getMarketsConfiguration(configuration.initialBlock);

  console.log(Object.keys(ageOneMarketsParameters).length, "markets found");

  const { liquidity, marketsEmissions } = computeMarketsEmission(
    ageOneMarketsParameters,
    configuration.totalEmission
  );

  console.log("Markets Emissions");

  const formattedMarketsEmission: {
    [market: string]: {
      supply: string;
      borrow: string;
      p2pIndexCursor: string;
    };
  } = {};
  Object.keys(marketsEmissions).forEach((m) => {
    const marketEmission = marketsEmissions[m];
    if (!marketEmission) return;
    formattedMarketsEmission[m] = {
      supply: marketEmission.supply.toString(),
      borrow: marketEmission.borrow.toString(),
      p2pIndexCursor: formatUnits(marketEmission.p2pIndexCursor, 4),
    };
  });

  // save the age into a file
  const ageOneMarketsFilename = `./ages/${configuration.epochName}/marketsEmission.json`;
  const ageMarketsPath = path.dirname(ageOneMarketsFilename);
  await fs.promises.mkdir(ageMarketsPath, { recursive: true });
  await fs.promises.writeFile(
    ageOneMarketsFilename,
    JSON.stringify(
      {
        totalEmission: configuration.totalEmission.toString(),
        parameters: {
          initialBlock: configuration.initialBlock.toString(),
          initialTimestamp: configuration.initialTimestamp.toString(),
          totalSupply: formatUnits(liquidity.totalSupply),
          totalBorrow: formatUnits(liquidity.totalBorrow),
          total: formatUnits(liquidity.total),
        },
        markets: formattedMarketsEmission,
      },
      null,
      2
    )
  );
  /// user related ///
  console.log("Fetch Morpho users of the age");

  const users: { [user: string]: Balance[] } = await fetchUsers(
    configuration.subgraphUrl,
    configuration.initialBlock,
    Object.keys(marketsEmissions),
    configuration.initialTimestamp.toNumber(),
    configuration.finalTimestamp.toNumber()
  );

  console.log("Compute users distribution through markets");
  const { usersDistribution } = computeUsersDistribution(
    users,
    marketsEmissions,
    configuration.finalTimestamp
  );

  // save the age into a file
  const ageOneFilename = `./ages/${configuration.epochName}/distribution.json`;
  const agePath = path.dirname(ageOneFilename);
  await fs.promises.mkdir(agePath, { recursive: true });
  await fs.promises.writeFile(ageOneFilename, JSON.stringify(usersDistribution, null, 2));
  const { root, proofs } = computeMerkleTree(usersDistribution);
  // save the age proofs into a file
  const ageOneProofsFilename = `./ages/${configuration.epochName}/proofs.json`;
  const ageProofsPath = path.dirname(ageOneProofsFilename);
  await fs.promises.mkdir(ageProofsPath, { recursive: true });
  await fs.promises.writeFile(ageOneProofsFilename, JSON.stringify({ root, proofs }, null, 2));
};

main(configuration.ageName, configuration.epochs.epoch1).catch((e) => {
  console.error(e);
  process.exit(1);
});
