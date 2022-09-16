import { providers } from "ethers";
import { MorphoCompound__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { TransactionType } from "../graph";

const blockTimestamps: { [blockNumber: number]: number | undefined } = {};
const getBlockTimestamp = async <T extends { getBlock: () => Promise<{ timestamp: number }>; blockNumber: number }>(
  event: T,
) => {
  let timestamp = blockTimestamps[event.blockNumber];
  if (!timestamp) {
    timestamp = await event.getBlock().then((b) => b.timestamp);
    blockTimestamps[event.blockNumber] = timestamp;
  }
  return timestamp as number;
};

export const getChainTransactions = async (provider: providers.Provider, blockFrom: number, blockTo: number) => {
  const morphoCompound = MorphoCompound__factory.connect(addresses.morphoCompound.morpho, provider);

  const suppliedFilter = morphoCompound.filters.Supplied();
  const suppliedEvents = await morphoCompound.queryFilter(suppliedFilter, blockFrom, blockTo).then((r) =>
    Promise.all(
      r.map(async (event) => ({
        id: event.transactionHash.toLowerCase() + "-" + event.logIndex,
        hash: event.transactionHash.toLowerCase(),
        logIndex: event.logIndex,
        user: event.args._onBehalf,
        timestamp: await getBlockTimestamp(event),
        market: event.args._poolTokenAddress,
        type: "Supply" as TransactionType,
      })),
    ),
  );
  const borrowedFilter = morphoCompound.filters.Borrowed();
  const borrowedEvents = await morphoCompound.queryFilter(borrowedFilter, blockFrom, blockTo).then((r) =>
    Promise.all(
      r.map(async (event) => ({
        id: event.transactionHash.toLowerCase() + "-" + event.logIndex,
        hash: event.transactionHash.toLowerCase(),
        logIndex: event.logIndex,
        user: event.args._borrower,
        timestamp: await getBlockTimestamp(event),
        market: event.args._poolTokenAddress,
        type: "Supply" as TransactionType,
      })),
    ),
  );
  const withdrawnFilter = morphoCompound.filters.Withdrawn();
  const withdrawnEvents = await morphoCompound.queryFilter(withdrawnFilter, blockFrom, blockTo).then((r) =>
    Promise.all(
      r.map(async (event) => ({
        id: event.transactionHash.toLowerCase() + "-" + event.logIndex,
        hash: event.transactionHash.toLowerCase(),
        logIndex: event.logIndex,
        user: event.args._supplier,
        timestamp: await getBlockTimestamp(event),
        market: event.args._poolTokenAddress,
        type: "Supply" as TransactionType,
      })),
    ),
  );
  const repaidFilter = morphoCompound.filters.Repaid();
  const repaidEvents = await morphoCompound.queryFilter(repaidFilter, blockFrom, blockTo).then((r) =>
    Promise.all(
      r.map(async (event) => ({
        id: event.transactionHash.toLowerCase() + "-" + event.logIndex,
        hash: event.transactionHash.toLowerCase(),
        logIndex: event.logIndex,
        user: event.args._onBehalf,
        timestamp: await getBlockTimestamp(event),
        market: event.args._poolTokenAddress,
        type: "Supply" as TransactionType,
      })),
    ),
  );
  return [...suppliedEvents, ...borrowedEvents, ...withdrawnEvents, ...repaidEvents];
};
