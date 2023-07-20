import { BigNumber, BigNumberish, constants, providers } from "ethers";
import { TransactionEvents, VaultDepositEvent, VaultTransferEvent, VaultWithdrawEvent } from "./types";
import { maxBN } from "@morpho-labs/ethers-utils/lib/utils";
import { VaultEventType } from "./Distributor";
import {
  MorphoAaveV2SupplyVault,
  MorphoAaveV2SupplyVault__factory,
  MorphoCompoundSupplyVault,
} from "@morpho-labs/morpho-ethers-contract";
import { epochUtils } from "../ages";

export interface EventsFetcherInterface {
  fetchSortedEventsForEpoch: (
    epochConfig: epochUtils.ParsedAgeEpochConfig
  ) => Promise<[TransactionEvents[], BigNumber]>;
  getBlock: (blockNumber: number) => Promise<providers.Block>;
}

export default class VaultEventsFetcher implements EventsFetcherInterface {
  private vault: MorphoAaveV2SupplyVault | MorphoCompoundSupplyVault;

  constructor(
    private vaultAddress: string,
    private provider: providers.Provider,
    private deploymentBlock: providers.BlockTag
  ) {
    // We can use both AaveV2 and Compound vaults factory here
    this.vault = MorphoAaveV2SupplyVault__factory.connect(vaultAddress, provider);
  }

  async fetchSortedEventsForEpoch({
    id,
    finalBlock,
    initialBlock,
    initialTimestamp,
  }: epochUtils.ParsedAgeEpochConfig): Promise<[TransactionEvents[], BigNumber]> {
    let timeFrom = BigNumber.from(initialTimestamp);
    const blockFromCurrentEpoch = maxBN(initialBlock!, this.deploymentBlock);
    const depositEvents = await this._fetchDepositEvents(blockFromCurrentEpoch, finalBlock!);

    console.log(id, depositEvents.length, "Deposit events");
    const withdrawEvents = await this._fetchWithdrawEvents(blockFromCurrentEpoch, finalBlock!);
    console.log(id, withdrawEvents.length, "Withdraw events");
    const transferEvents = await this._fetchTransferEvents(blockFromCurrentEpoch, finalBlock!);
    console.log(id, transferEvents.length, "Transfer events");

    // we assume that, after the first deposit event, the vaults is never empty
    // TODO: handle the case if there is an empty vault after starting distribution
    if (!blockFromCurrentEpoch.eq(initialBlock!)) {
      const [firstDeposit] = depositEvents.sort((event1, event2) =>
        event1.event.blockNumber > event2.event.blockNumber ? 1 : -1
      );
      if (!firstDeposit)
        throw Error(`Inconsistent config: some MORPHO tokens are distributed while there is no deposit in ${id}`);
      const firstDepositBlock = await this.provider.getBlock(firstDeposit.event.blockNumber);
      timeFrom = BigNumber.from(firstDepositBlock.timestamp);
    }

    // now we first order events
    const allEvents: TransactionEvents[] = [...depositEvents, ...withdrawEvents, ...transferEvents].sort(
      (event1, event2) => {
        if (event1.event.blockNumber !== event2.event.blockNumber)
          return event1.event.blockNumber - event2.event.blockNumber;
        if (event1.event.transactionIndex !== event2.event.transactionIndex)
          return event1.event.transactionIndex - event2.event.transactionIndex;
        if (event1.event.logIndex !== event2.event.logIndex) return event1.event.logIndex - event2.event.logIndex;
        throw Error("Inconsistent events");
      }
    );
    return [allEvents, timeFrom];
  }

  async getBlock(blockNumber: number): Promise<providers.Block> {
    return this.provider.getBlock(blockNumber);
  }

  private async _fetchDepositEvents(
    blockFromCurrentEpoch: BigNumber,
    blockTo: BigNumberish
  ): Promise<VaultDepositEvent[]> {
    const events = await this.vault.queryFilter(
      this.vault.filters.Deposit(),
      +blockFromCurrentEpoch.toString(),
      +BigNumber.from(blockTo).toString()
    );
    return events.map((event) => ({
      type: VaultEventType.Deposit,
      event,
    }));
  }

  private async _fetchWithdrawEvents(
    blockFromCurrentEpoch: BigNumber,
    blockTo: BigNumberish
  ): Promise<VaultWithdrawEvent[]> {
    const events = await this.vault.queryFilter(
      this.vault.filters.Withdraw(),
      +blockFromCurrentEpoch.toString(),
      +BigNumber.from(blockTo).toString()
    );

    return events.map((event) => ({
      type: VaultEventType.Withdraw,
      event,
    }));
  }

  private async _fetchTransferEvents(
    blockFromCurrentEpoch: BigNumber,
    blockTo: BigNumberish
  ): Promise<VaultTransferEvent[]> {
    const events = await this.vault.queryFilter(
      this.vault.filters.Transfer(),
      +blockFromCurrentEpoch.toString(),
      +BigNumber.from(blockTo).toString()
    );

    return events
      .filter(({ args }) => args.from !== constants.AddressZero && args.to !== constants.AddressZero) // mint and burn are not considered
      .map((event) => ({
        type: VaultEventType.Transfer,
        event,
      }));
  }
}
