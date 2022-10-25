import { providers } from "ethers";
import { MorphoCompound__factory } from "@morpho-labs/morpho-ethers-contract";
import { TransactionType } from "../graph";
import { Optional } from "../../helpers/types";

const blockTimestamps: { [blockNumber: number]: Optional<number> } = {};
const getBlockTimestamp = async <T extends { getBlock: () => Promise<{ timestamp: number }>; blockNumber: number }>(
  event: T
) => {
  let timestamp = blockTimestamps[event.blockNumber];
  if (!timestamp) {
    timestamp = await event.getBlock().then((b) => b.timestamp);
    blockTimestamps[event.blockNumber] = timestamp;
  }
  return timestamp as number;
};

export const getChainTransactions = async (
  provider: providers.Provider,
  blockFrom: number,
  blockTo: number,
  morphoAddress: string
) => {
  const morpho = MorphoCompound__factory.connect(morphoAddress, provider);

  const suppliedFilter = morpho.filters.Supplied();
  const suppliedEvents = await morpho.queryFilter(suppliedFilter, blockFrom, blockTo).then((r) =>
    Promise.all(
      r.map(async (event) => ({
        id: event.transactionHash.toLowerCase() + "-" + event.logIndex,
        hash: event.transactionHash.toLowerCase(),
        logIndex: event.logIndex,
        user: event.args._onBehalf,
        timestamp: await getBlockTimestamp(event),
        market: event.args._poolTokenAddress,
        type: "Supply" as TransactionType,
      }))
    )
  );
  const borrowedFilter = morpho.filters.Borrowed();
  const borrowedEvents = await morpho.queryFilter(borrowedFilter, blockFrom, blockTo).then((r) =>
    Promise.all(
      r.map(async (event) => ({
        id: event.transactionHash.toLowerCase() + "-" + event.logIndex,
        hash: event.transactionHash.toLowerCase(),
        logIndex: event.logIndex,
        user: event.args._borrower,
        timestamp: await getBlockTimestamp(event),
        market: event.args._poolTokenAddress,
        type: "Supply" as TransactionType,
      }))
    )
  );
  const withdrawnFilter = morpho.filters.Withdrawn();
  const withdrawnEvents = await morpho.queryFilter(withdrawnFilter, blockFrom, blockTo).then((r) =>
    Promise.all(
      r.map(async (event) => ({
        id: event.transactionHash.toLowerCase() + "-" + event.logIndex,
        hash: event.transactionHash.toLowerCase(),
        logIndex: event.logIndex,
        user: event.args._supplier,
        timestamp: await getBlockTimestamp(event),
        market: event.args._poolTokenAddress,
        type: "Supply" as TransactionType,
      }))
    )
  );
  const repaidFilter = morpho.filters.Repaid();
  const repaidEvents = await morpho.queryFilter(repaidFilter, blockFrom, blockTo).then((r) =>
    Promise.all(
      r.map(async (event) => ({
        id: event.transactionHash.toLowerCase() + "-" + event.logIndex,
        hash: event.transactionHash.toLowerCase(),
        logIndex: event.logIndex,
        user: event.args._onBehalf,
        timestamp: await getBlockTimestamp(event),
        market: event.args._poolTokenAddress,
        type: "Supply" as TransactionType,
      }))
    )
  );
  return [...suppliedEvents, ...borrowedEvents, ...withdrawnEvents, ...repaidEvents];
};
