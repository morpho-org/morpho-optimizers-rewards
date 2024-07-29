import * as dotenv from "dotenv";
import { providers } from "ethers";
import { MulticallWrapper } from "ethers-multicall-provider";
import * as fs from "fs";

import { epochUtils } from "../ages";

dotenv.config();

const generateGraphEmissions = async () => {
  const provider = MulticallWrapper.wrap(new providers.JsonRpcProvider(process.env.RPC_URL));
  const epochs = await epochUtils.snapshotableEpochs();
  const distributions: {
    epoch: any;
    distribution: Awaited<ReturnType<typeof epochs[number]["distributionScript"]>>;
  }[] = [];

  for (const epoch of epochs) {
    const distribution = await epoch.distributionScript({
      ...epoch,
      provider,
      ...epoch.distributionParameters,
      snapshotBlock: epoch.snapshotBlock!,
    });
    distributions.push({ epoch, distribution });
  }
  const formattedEmissions: Record<string, string> = {};

  const allEpochsDefined = await epochUtils.allEpochs();
  const getKey = (epochId: string) => `epoch-${allEpochsDefined.findIndex(({ id }) => id === epochId) + 1}`;

  distributions.forEach(({ epoch, distribution }) => {
    Object.entries(distribution.marketsEmissions).forEach(([market, distribution]) => {
      const generateKey = (side: "Supply" | "Borrow") => [getKey(epoch.id), side, market].join("-");

      formattedEmissions[generateKey("Supply")] = distribution!.morphoRatePerSecondSupplySide.toString();
      formattedEmissions[generateKey("Borrow")] = distribution!.morphoRatePerSecondBorrowSide.toString();
    });
  });
  const startTimestamps = Object.fromEntries(
    allEpochsDefined.map(({ id, initialTimestamp }) => [getKey(id), initialTimestamp.toString()])
  );
  const endTimestamps = Object.fromEntries(
    allEpochsDefined.map(({ id, finalTimestamp }) => [getKey(id), finalTimestamp.toString()])
  );

  const file = `// File autogenerated by running the command "yarn markets:emissions:subgraph" at the root of the project
import { BigInt } from "@graphprotocol/graph-ts";

export const epochToStartTimestamps = new Map<string, BigInt>()
  ${Object.entries(startTimestamps)
    .map(([epoch, timestamp]) => `.set("${epoch}", BigInt.fromString("${timestamp}"))`)
    .join("\n\t")};
      
export const epochToEndTimestamps = new Map<string, BigInt>()
  ${Object.entries(endTimestamps)
    .map(([epoch, timestamp]) => `.set("${epoch}", BigInt.fromString("${timestamp}"))`)
    .join("\n\t")};

export const emissions = new Map<string, BigInt>()
  ${Object.entries(formattedEmissions)
    .map(([key, value]) => `.set("${key}", BigInt.fromString("${value}"))`)
    .join("\n\t")};
  `;

  await fs.promises.writeFile("subgraph/src/generated-emissions.ts", file);
};

generateGraphEmissions().catch((e) => {
  console.error(e);
  process.exit(1);
});
