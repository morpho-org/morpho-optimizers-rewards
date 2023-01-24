import * as dotenv from "dotenv";
import { providers } from "ethers";
import { allEpochs, startedEpochs } from "../ages/ages";
import * as fs from "fs";

dotenv.config();
const generateGraphDistribution = async () => {
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

  await fs.promises.writeFile(
    "distribution/ipfs.json",
    JSON.stringify({ startTimestamps, formattedEmissions }, null, 2)
  );
};

generateGraphDistribution().catch((e) => {
  console.error(e);
  process.exit(1);
});
