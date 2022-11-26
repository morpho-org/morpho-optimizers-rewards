import { getAllProofs, Proofs } from "../utils/getCurrentOnChainDistribution";
import { EpochConfig } from "../ages";
import { getEpochFromId } from "../utils/timestampToEpoch";

export interface ProofsFetcherInterface {
  fetchProofs: (address: string, epochToId?: string) => Promise<Proofs[]>;
  getEpochFromId: (epochId: string) => EpochConfig;
}

export default class ProofsFetcher implements ProofsFetcherInterface {
  async fetchProofs(address: string, epochToId?: string): Promise<Proofs[]> {
    const proofs = getAllProofs()
      .reverse()
      .filter((proofs) => !!proofs.proofs[address.toLowerCase()]?.amount);
    if (epochToId) {
      const epochConfig = getEpochFromId(epochToId);
      if (!epochConfig) throw Error(`Invalid epoch id ${epochToId}`);
      const epochIndex = proofs.findIndex((proof) => proof.epoch === epochConfig.id);
      return proofs.slice(0, epochIndex + 1); // empty array if epochIndex === -1
    }
    return proofs;
  }

  getEpochFromId(epochId: string): EpochConfig {
    return getEpochFromId(epochId)!;
  }
}
