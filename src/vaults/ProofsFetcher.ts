import { EpochConfig } from "../ages";
import { getEpochFromId } from "../utils";
import { Proofs } from "../ages/distributions/Proofs";
import { StorageService } from "../utils/StorageService";

export interface ProofsFetcherInterface {
  fetchProofs: (address: string, epochToId?: string) => Promise<Proofs[]>;
  getEpochFromId: (epochId: string) => EpochConfig;
}

export default class ProofsFetcher implements ProofsFetcherInterface {
  constructor(private readonly storageService: StorageService) {}

  async fetchProofs(address: string, epochToId?: string): Promise<Proofs[]> {
    const allProofs = await this.storageService.readAllProofs();
    const proofs = allProofs.reverse().filter((proofs) => !!proofs.proofs[address.toLowerCase()]?.amount);
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
