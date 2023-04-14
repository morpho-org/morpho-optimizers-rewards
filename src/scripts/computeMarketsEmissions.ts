import { getEpochFromNumber } from "../utils/timestampToEpoch";
import { providers } from "ethers";
import { commify, formatUnits } from "ethers/lib/utils";
import * as dotenv from "dotenv";
import { startedEpochs } from "../ages/ages";
import { FileSystemStorageService } from "../utils/StorageService";
import { computeEpochMarketsDistribution } from "../utils/getEpochMarketsDistribution";

dotenv.config();

const storageService = new FileSystemStorageService();

const computeMarketsEmissions = async (epochNumber?: number) => {
  if (epochNumber) console.log(`Compute markets emissions for ${epochNumber}`);
  else console.log("Compute markets emissions for all epochs");

  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);

  if (epochNumber && !getEpochFromNumber(epochNumber)) throw new Error("Invalid epoch id");

  const epochs = epochNumber ? [getEpochFromNumber(epochNumber)!] : startedEpochs;
  if (!epochNumber)
    console.log(`${epochs.length} epochs to compute, to epoch ${epochs[epochs.length - 1].epoch.epochNumber}`);

  // Compute emissions for each epoch
  const emissions = await Promise.all(
    epochs.map(async ({ epoch }) => {
      return computeEpochMarketsDistribution(epoch.epochNumber, provider, storageService, true);
    })
  );

  // Log a recap to the console
  const recap = emissions.map((marketsEmissions) => {
    return {
      age: marketsEmissions.age,
      epoch: marketsEmissions.epoch,
      markets: Object.keys(marketsEmissions.markets).length,
      totalEmission: commify(marketsEmissions.totalEmission),
      start: new Date(+marketsEmissions.parameters.initialTimestamp.toString() * 1000).toISOString(),
      end: new Date(+marketsEmissions.parameters.finalTimestamp.toString() * 1000).toISOString(),
    };
  });
  console.table(recap);
};

const epochIdIndex = process.argv.indexOf("--epoch");
let epochNumber = undefined;
if (epochIdIndex !== -1) {
  epochNumber = parseFloat(process.argv[epochIdIndex + 1]);
  if (isNaN(epochNumber)) throw new Error("Invalid epoch id");
}

computeMarketsEmissions(epochNumber)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit(0));
