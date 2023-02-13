import * as dotenv from "dotenv";
import { providers } from "ethers";
import { allEpochs, startedEpochs } from "../ages/ages";
import * as fs from "fs";

dotenv.config();

import { pinata, uploadToIPFS } from "../utils/ipfs/uploadToIPFS";
const generateGraphEmissions = async () => {
  const canUse = await pinata.testAuthentication();

  if (!canUse.authenticated) throw new Error("Wrong Pinata Key");

  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
  const distributions = await Promise.all(
    startedEpochs.map(async (epoch) => ({
      epoch,
      distribution: await epoch.ageConfig.distribution(epoch.ageConfig, epoch, provider),
    }))
  );
  const formattedEmissions: Record<string, string> = {};
  distributions.forEach(({ epoch, distribution }) => {
    Object.entries(distribution.marketsEmissions).forEach(([market, distribution]) => {
      formattedEmissions[`${epoch.id}-Supply-${market}`] = distribution!.supplyRate.toString();
      formattedEmissions[`${epoch.id}-Borrow-${market}`] = distribution!.borrowRate.toString();
    });
  });
  const startTimestamps = Object.fromEntries(allEpochs.map((e) => [e.id, e.initialTimestamp.toString()]));
  const endTimestamps = Object.fromEntries(allEpochs.map((e) => [e.id, e.finalTimestamp.toString()]));
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
