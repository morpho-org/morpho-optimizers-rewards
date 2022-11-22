import {BigNumber, BigNumberish, providers} from "ethers";
import {TransactionEvents, VaultDepositEvent, VaultTransferEvent, VaultWithdrawEvent} from "./types";
import {minBN} from "@morpho-labs/ethers-utils/lib/utils";
import _sortBy from "lodash/sortBy";
import {VaultEventType} from "./distributeVaults";
import {EpochConfig} from "../ages";
import {ERC4626, ERC4626__factory} from "./contracts";

export interface EventsFetcherInterface {
    fetchSortedEventsForEpoch: (epochConfig: EpochConfig) => Promise<[TransactionEvents[], BigNumber]>;
    getBlock: (blockNumber: number) => Promise<providers.Block>;
}
export default class VaultEventsFetcher implements EventsFetcherInterface {
    private vault: ERC4626;
    constructor(
        private vaultAddress: string,
        private provider: providers.Provider,
        private deploymentBlock: providers.BlockTag
    ) {
        this.vault = ERC4626__factory.connect(vaultAddress, provider);
    }
    async fetchSortedEventsForEpoch(epochConfig: EpochConfig): Promise<[TransactionEvents[], BigNumber]> {
        const blockFrom = await this.provider.getBlock(this.deploymentBlock);

        let timeFrom = epochConfig.initialTimestamp;
        const blockFromCurrentEpoch = minBN(epochConfig.initialBlock!, blockFrom.number);

        const depositEvents = await this._fetchDepositEvents(blockFromCurrentEpoch, epochConfig.finalBlock!);

        console.timeLog(epochConfig.id, depositEvents.length, "Deposit events");
        const withdrawEvents = await this._fetchWithdrawEvents(blockFromCurrentEpoch, epochConfig.finalBlock!);
        console.timeLog(epochConfig.id, withdrawEvents.length, "Withdraw events");
        const transferEvents = await this._fetchTransferEvents(blockFromCurrentEpoch, epochConfig.finalBlock!);
        console.timeLog(epochConfig.id, transferEvents.length, "Transfer events");

        // we assume that, after the first deposit event, the vault is never empty
        if (!blockFromCurrentEpoch.eq(epochConfig.initialBlock!)) {
            const [firstDeposit] = depositEvents.sort((event1, event2) =>
                event1.event.blockNumber > event2.event.blockNumber ? 1 : -1
            );
            if (!firstDeposit)
                throw Error(
                    `Inconsistent config: some MORPHO tokens are distributed where there is no deposit in epoch ${epochConfig.id}`
                );
            const firstDepositBlock = await this.provider.getBlock(firstDeposit.event.blockNumber);
            timeFrom = BigNumber.from(firstDepositBlock.timestamp);
        }


        // now we first order events

        const allEvents: TransactionEvents[] = _sortBy([...depositEvents, ...withdrawEvents, ...transferEvents], (ev: TransactionEvents) => [
            ev.event.blockNumber,
            ev.event.transactionIndex,
            ev.event.logIndex,
        ]);
        return [allEvents, timeFrom];
    }

    async getBlock(blockNumber: number): Promise<providers.Block> {
        return this.provider.getBlock(blockNumber);
    }

    private async _fetchDepositEvents (blockFromCurrentEpoch: BigNumber, blockTo: BigNumberish): Promise<VaultDepositEvent[]> {
        const events = await this.vault.queryFilter(
                this.vault.filters.Deposit(),
                blockFromCurrentEpoch.toString(),
                BigNumber.from(blockTo).toString()
            );
        return events.map((event) => ({
            type: VaultEventType.Deposit,
            event,
        }));
    }
    private async _fetchWithdrawEvents (blockFromCurrentEpoch: BigNumber, blockTo: BigNumberish): Promise<VaultWithdrawEvent[]> {
        const events = await this.vault.queryFilter(
                this.vault.filters.Withdraw(),
                blockFromCurrentEpoch.toString(),
                BigNumber.from(blockTo).toString()
            );
        return events.map((event) => ({
            type: VaultEventType.Withdraw,
            event,
        }));
    }

    private async _fetchTransferEvents (blockFromCurrentEpoch: BigNumber, blockTo: BigNumberish): Promise<VaultTransferEvent[]> {
        const events = await this.vault.queryFilter(
                this.vault.filters.Transfer(),
                blockFromCurrentEpoch.toString(),
                BigNumber.from(blockTo).toString()
            );
        return events.map((event) => ({
            type: VaultEventType.Transfer,
            event,
        }));
    }

}