import { getEpochFromId } from "../utils/timestampToEpoch";
import { providers } from "ethers";
import { commify, formatUnits } from "ethers/lib/utils";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { startedEpochs } from "../ages/ages";

dotenv.config();

const computeMarketsEmissions = async (epochId?: string) => {
  if (epochId) console.log(`Compute markets emissions for ${epochId}`);
  else console.log("Compute markets emissions for all epochs");
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
  if (epochId && !getEpochFromId(epochId)) throw new Error("Invalid epoch id");
  const epochs = epochId ? [getEpochFromId(epochId)!] : startedEpochs;
  if (!epochId) console.log(`${epochs.length} epochs to compute, to ${epochs[epochs.length - 1].id}`);
  const emissions = await Promise.all(
    epochs.map(async (epoch) => {
      const { marketsEmissions } = await epoch.ageConfig.distribution(epoch, provider);
      return {
        epoch,
        marketsEmissions,
      };
    })
  );
  await Promise.all(
    emissions.map(async ({ epoch, marketsEmissions }) => {
      const distribution = {
        age: epoch.ageConfig.ageName,
        epoch: epoch.epochName,
        totalEmission: formatUnits(epoch.totalEmission),
        parameters: {
          snapshotBlock: epoch.snapshotBlock!.toString(),
          initialTimestamp: epoch.initialTimestamp.toString(),
          finalTimestamp: epoch.finalTimestamp.toString(),
          duration: epoch.finalTimestamp.sub(epoch.initialTimestamp).toString(),
        },
        markets: Object.fromEntries(
          Object.entries(marketsEmissions).map(([key, marketConfig]) => [
            key.toLowerCase(),
            {
              supply: formatUnits(marketConfig!.supply),
              supplyRate: marketConfig!.supplyRate.toString(),
              borrowRate: marketConfig!.borrowRate.toString(),
              borrow: formatUnits(marketConfig!.borrow),
            },
          ])
        ),
      };
      await fs.promises.mkdir(`distribution/${epoch.ageConfig.ageName}/${epoch.epochName}`, { recursive: true });
      await fs.promises.writeFile(
        `distribution/${epoch.ageConfig.ageName}/${epoch.epochName}/marketsEmission.json`,
        JSON.stringify(distribution, null, 2)
      );
    })
  );

  const recap = emissions.map(({ epoch, marketsEmissions }) => {
    return {
      age: epoch.age,
      epoch: epoch.epochName,
      markets: Object.keys(marketsEmissions).length,
      totalEmission: commify(epoch.totalEmission.toString()),
      start: new Date(+epoch.initialTimestamp.toString() * 1000).toISOString(),
      end: new Date(+epoch.finalTimestamp.toString() * 1000).toISOString(),
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
