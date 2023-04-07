import * as dotenv from "dotenv";
import { providers } from "ethers";
import { allEpochs } from "../ages";
import * as fs from "fs";

dotenv.config();

import { pinata, uploadToIPFS } from "../utils/ipfs/uploadToIPFS";
const generateGraphEmissions = async () => {
  const canUse = await pinata.testAuthentication();

  if (!canUse.authenticated) throw new Error("Wrong Pinata Key");

  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
  const distributions = await Promise.all(
    allEpochs
      .filter(({ epoch }) => epoch.initialTimestamp.sub(3600).lt(Math.floor(Date.now() / 1000)))
      .map(async ({ epoch, age }) => ({
        epoch,
        distribution: await age.distribution(age, epoch, provider),
      }))
  );
  const formattedEmissions: Record<string, string> = {};

  distributions.forEach(({ epoch, distribution }) => {
    Object.entries(distribution.marketsEmissions).forEach(([market, distribution]) => {
      const generateKey = (side: "Supply" | "Borrow") => ["epoch", epoch.epochNumber, side, market].join("-");

      formattedEmissions[generateKey("Supply")] = distribution!.morphoRatePerSecondSupplySide.toString();
      formattedEmissions[generateKey("Borrow")] = distribution!.morphoRatePerSecondBorrowSide.toString();
    });
  });

  const epochKey = (epoch: number) => `epoch-${epoch}`;
  const startTimestamps = Object.fromEntries(
    allEpochs.map(({ epoch: { epochNumber, initialTimestamp } }) => [
      epochKey(epochNumber),
      initialTimestamp.toString(),
    ])
  );
  const endTimestamps = Object.fromEntries(
    allEpochs.map(({ epoch: { epochNumber, finalTimestamp } }) => [epochKey(epochNumber), finalTimestamp.toString()])
  );

  const hash = await uploadToIPFS({
    name: "subgraph-distribution.json",
    body: { startTimestamps, endTimestamps, formattedEmissions },
  });

  if (!hash) throw Error("Cannot upload to IPFS");

  console.log("Override IPFS hash on the subgraph with", hash);

  await fs.promises.writeFile(
    "subgraph/src/ipfs.ts",
    `export const IPFS_HASH = "${hash}";
`
  );
};

generateGraphEmissions().catch((e) => {
  console.error(e);
  process.exit(1);
});
