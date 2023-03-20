import { getEpochFromId } from "../utils/timestampToEpoch";
import { providers } from "ethers";
import { commify, formatUnits } from "ethers/lib/utils";
import * as dotenv from "dotenv";
import { startedEpochs } from "../ages/ages";
import { FileSystemStorageService } from "../utils/StorageService";
import { computeEpochMarketsDistribution } from "../utils/getEpochMarketsDistribution";

dotenv.config();

const storageService = new FileSystemStorageService();

const computeMarketsEmissions = async (epochId?: string) => {
  if (epochId) console.log(`Compute markets emissions for ${epochId}`);
  else console.log("Compute markets emissions for all epochs");

  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);

  if (epochId && !getEpochFromId(epochId)) throw new Error("Invalid epoch id");

  const epochs = epochId ? [getEpochFromId(epochId)!] : startedEpochs;
  if (!epochId) console.log(`${epochs.length} epochs to compute, to ${epochs[epochs.length - 1].id}`);

  // Compute emissions for each epoch
  const emissions = await Promise.all(
    epochs.map(async (epoch) => {
      return computeEpochMarketsDistribution(epoch.ageConfig.ageName, epoch.epochName, provider, storageService, true);
    })
  );

  // Log a recap to the console
  const recap = emissions.map((marketsEmissions) => {
    return {
      age: marketsEmissions.age,
      epoch: marketsEmissions.epoch,
      markets: Object.keys(marketsEmissions.markets).length,
      totalEmission: commify(formatUnits(marketsEmissions.totalEmission)),
      start: new Date(+marketsEmissions.parameters.initialTimestamp.toString() * 1000).toISOString(),
      end: new Date(+marketsEmissions.parameters.finalTimestamp.toString() * 1000).toISOString(),
    };
  });
  console.table(recap);
};

const epochIdIndex = process.argv.indexOf("--epoch");
let epochId = undefined;
if (epochIdIndex !== -1) epochId = process.argv[epochIdIndex + 1];

computeMarketsEmissions(epochId)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit(0));
