import { TransactionEvents } from "../../src/vaults/types";
import Distributor from "../../src/vaults/Distributor";
import { EventsFetcherInterface } from "../../src/vaults/VaultEventsFetcher";
import { BigNumber, constants, providers } from "ethers";
import { ProofsFetcherInterface } from "../../src/vaults/ProofsFetcher";
import { maxBN } from "@morpho-labs/ethers-utils/lib/utils";
import { epochUtils } from "../../src";
import { Proofs } from "../../src/ages/distributions/Proofs";
import { computeMerkleTree } from "../../src/utils";
import ProofsFetcher from "../../src/vaults/ProofsFetcher";
import { FileSystemStorageService } from "../../src/utils/StorageService";

export const distributorFromEvents = (
  vaultAddress: string,
  events: TransactionEvents[],
  useRealDistribution = true,
  numberOfEpochs = 1
): Distributor => {
  class LocalEventFetcher implements EventsFetcherInterface {
    private _events = events;
    async fetchSortedEventsForEpoch(
      epochConfig: epochUtils.ParsedAgeEpochConfig
    ): Promise<[TransactionEvents[], BigNumber]> {
      const epochEvents = this._events.filter(
        (ev) =>
          BigNumber.from(ev.event.blockNumber).gte(epochConfig.initialBlock!) &&
          BigNumber.from(ev.event.blockNumber).lte(epochConfig.finalBlock!)
      );
      if (epochEvents.length === 0) return [[], BigNumber.from(epochConfig.initialTimestamp)];

      const blockFrom = maxBN(epochEvents[0].event.blockNumber, epochConfig.initialBlock!);
      const timeFrom = await this.getBlock(+blockFrom.toString()).then((block) => BigNumber.from(block.timestamp));
      return [epochEvents, timeFrom];
    }
    async getBlock(blockNumber: number): Promise<providers.Block> {
      const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
      return provider.getBlock(blockNumber);
    }
  }

  class StaticProofsFetcher implements ProofsFetcherInterface {
    async fetchProofs(address: string, epochToId?: string): Promise<Proofs[]> {
      if (address === constants.AddressZero || !events.length) return [];
      return Array.from({ length: numberOfEpochs }).map((_, i) => {
        const epochId = epochToId ?? `age${i}`;
        const { proofs, root, total } = computeMerkleTree([
          {
            address: vaultAddress,
            accumulatedRewards: (1000 * (i + 1)).toString(),
          },
        ]);

        return {
          epochId,
          proofs,
          root,
          total,
        };
      });
    }
  }
  const eventsFetcher = new LocalEventFetcher();
  const proofsFetcher = useRealDistribution
    ? new ProofsFetcher(new FileSystemStorageService())
    : new StaticProofsFetcher();

  return new Distributor(vaultAddress, eventsFetcher, proofsFetcher);
};
