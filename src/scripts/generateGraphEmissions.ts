import * as dotenv from "dotenv";
import { providers } from "ethers";
import { epochUtils } from "../ages";
import * as fs from "fs";

dotenv.config();

import { pinata, uploadToIPFS } from "../utils/ipfs/uploadToIPFS";
const generateGraphEmissions = async () => {
  const canUse = await pinata.testAuthentication();

  if (!canUse.authenticated) throw new Error("Wrong Pinata Key");

  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
  const epochs = await epochUtils.snapshotableEpochs();
  const distributions = await Promise.all(
    epochs.map(async (epoch) => ({
      epoch,
      distribution: await epoch.distributionScript({
        ...epoch,
        provider,
        ...epoch.distributionParameters,
        snapshotBlock: epoch.snapshotBlock!,
      }),
    }))
  );
  const formattedEmissions: Record<string, string> = {};

  const allEpochsDefined = await epochUtils.allEpochs();
  const getKey = (epochId: string) => allEpochsDefined.findIndex(({ id }) => id === epochId) + 1;

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

  const template = `import { BigInt } from "@graphprotocol/graph-ts";

export const startTimestamps = new Map<i32, BigInt>();
 ${Object.entries(startTimestamps)
   .map(([key, value]) => `startTimestamps.set(${key} as i32, BigInt.fromI32(${value} as i32));`)
   .join("\n")}
 
 export const endTimestamps = new Map<i32, BigInt>();
  ${Object.entries(endTimestamps)
    .map(([key, value]) => `endTimestamps.set(${key} as i32, BigInt.fromI32(${value} as i32));`)
    .join("\n")}
  
  export const formattedEmissions = new Map<string, BigInt>();
  ${Object.entries(formattedEmissions)
    .map(([key, value]) => `formattedEmissions.set("${key}", BigInt.fromString("${value}"));`)
    .join("\n")}

`;

  const hash = await uploadToIPFS({
    name: "subgraph-distribution.json",
    body: { startTimestamps, endTimestamps, formattedEmissions },
  });

  if (!hash) throw Error("Cannot upload to IPFS");

  console.log("Override IPFS hash on the subgraph with", hash);

  await fs.promises.writeFile("subgraph/src/distributionStore.ts", template);
};

generateGraphEmissions().catch((e) => {
  console.error(e);
  process.exit(1);
});
