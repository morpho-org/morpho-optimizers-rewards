import * as dotenv from "dotenv";
import { providers } from "ethers";
import { allEpochs, snapshotableEpochs } from "../ages";
import * as fs from "fs";

dotenv.config();

import { pinata, uploadToIPFS } from "../utils/ipfs/uploadToIPFS";
const generateGraphEmissions = async () => {
  const canUse = await pinata.testAuthentication();

  if (!canUse.authenticated) throw new Error("Wrong Pinata Key");

  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
  const epochs = await snapshotableEpochs();
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

  distributions.forEach(({ epoch, distribution }) => {
    Object.entries(distribution.marketsEmissions).forEach(([market, distribution]) => {
      const generateKey = (side: "Supply" | "Borrow") => [epoch.id, side, market].join("-");

      formattedEmissions[generateKey("Supply")] = distribution!.morphoRatePerSecondSupplySide.toString();
      formattedEmissions[generateKey("Borrow")] = distribution!.morphoRatePerSecondBorrowSide.toString();
    });
  });

  const allEpochsDefined = await allEpochs();
  const startTimestamps = Object.fromEntries(
    allEpochsDefined.map(({ id, initialTimestamp }) => [id, initialTimestamp.toString()])
  );
  const endTimestamps = Object.fromEntries(
    allEpochsDefined.map(({ id, finalTimestamp }) => [id, finalTimestamp.toString()])
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
