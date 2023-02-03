import * as dotenv from "dotenv";
import { providers } from "ethers";
import { allEpochs, startedEpochs } from "../ages/ages";
import * as fs from "fs";

dotenv.config();
const generateGraphEmission = async () => {
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

  await fs.promises.writeFile(
    "distribution/ipfs.json",
    JSON.stringify({ startTimestamps, endTimestamps, formattedEmissions }, null, 2)
  );
};

generateGraphEmission().catch((e) => {
  console.error(e);
  process.exit(1);
});
