import { providers } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import * as dotenv from "dotenv";
import { epochUtils } from "../ages";
import { FileSystemStorageService } from "../utils/StorageService";
import { mapValues } from "lodash";
import { MarketsEmissionFs } from "../ages/distributions/MarketsEmissionFs";
import { MulticallWrapper } from "ethers-multicall-provider";

dotenv.config();

const storageService = new FileSystemStorageService();

const computeMarketsEmissions = async (epochId?: string) => {
  if (epochId && !epochUtils.epochNames.includes(epochId)) throw new Error("Invalid epoch id");
  if (epochId) console.log(`Compute markets emissions for ${epochId}`);
  else console.log("Compute markets emissions for all epochs");

  const provider = MulticallWrapper.wrap(new providers.JsonRpcProvider(process.env.RPC_URL));

  const epochs = epochId ? [await epochUtils.getEpoch(epochId)] : await epochUtils.snapshotableEpochs();
  if (!epochId) console.log(`${epochs.length} epochs to compute, to ${epochs[epochs.length - 1].id}`);

  // Compute emissions for each epoch
  const emissions = await Promise.all(
    epochs.map(async (epoch) => {
      if (!epoch.snapshotBlock) throw new Error(`Epoch ${epoch.id} has no snapshot block`);
      const { marketsEmissions } = await epoch.distributionScript({
        ...epoch,
        ...epoch.distributionParameters,
        provider,
        snapshotBlock: epoch.snapshotBlock!,
      });

      const markets = mapValues(
        marketsEmissions,
        ({
          morphoEmittedSupplySide,
          morphoEmittedBorrowSide,
          morphoRatePerSecondBorrowSide,
          morphoRatePerSecondSupplySide,
          totalMarketSizeSupplySide,
          totalMarketSizeBorrowSide,
          decimals,
        }) => ({
          morphoEmittedSupplySide: formatUnits(morphoEmittedSupplySide),
          morphoRatePerSecondSupplySide: formatUnits(morphoRatePerSecondSupplySide),
          morphoRatePerSecondBorrowSide: formatUnits(morphoRatePerSecondBorrowSide),
          morphoEmittedBorrowSide: formatUnits(morphoEmittedBorrowSide),
          totalMarketSizeSupplySide: formatUnits(totalMarketSizeSupplySide, decimals),
          totalMarketSizeBorrowSide: formatUnits(totalMarketSizeBorrowSide, decimals),
        })
      );
      const marketsEmissionFs: MarketsEmissionFs = {
        epochId: epoch.id,
        totalEmission: formatUnits(epoch.distributionParameters.totalEmission),
        snapshotProposal: epoch.distributionParameters.snapshotProposal,
        parameters: {
          ...epochUtils.rawEpochs.find((e) => e.id === epoch.id)!.distributionParameters,
          snapshotBlock: epoch.snapshotBlock!,
          initialTimestamp: epoch.initialTimestamp,
          finalTimestamp: epoch.finalTimestamp,
          duration: epoch.finalTimestamp - epoch.initialTimestamp,
        },
        markets,
      };

      await storageService.writeMarketEmission(epoch.id, marketsEmissionFs, true);

      return marketsEmissionFs;
    })
  );

  // Log a recap to the console
  const recap = emissions.map((e) => ({
    epochId: e.epochId,
    totalEmission: e.totalEmission,
    initialTimestamp: e.parameters.initialTimestamp,
    finalTimestamp: e.parameters.finalTimestamp,
    duration: e.parameters.duration,
    snapshotBlock: e.parameters.snapshotBlock,
  }));

  console.table(recap);
};

const epochIdIndex = process.argv.indexOf("--id");
let epochNumber = undefined;
if (epochIdIndex !== -1) {
  epochNumber = process.argv[epochIdIndex + 1];
}

computeMarketsEmissions(epochNumber)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit(0));
