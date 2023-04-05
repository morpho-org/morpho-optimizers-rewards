import { EpochConfig } from "../ages";
import { Proofs } from "../ages/distributions/Proofs";
import { StorageService } from "../utils/StorageService";
import { getEpochFromNumber } from "../utils/timestampToEpoch";

export interface ProofsFetcherInterface {
  fetchProofs: (address: string, epochToNumber?: number) => Promise<Proofs[]>;
  getEpochFromNumber: (epochNumber: number) => EpochConfig;
}

export default class ProofsFetcher implements ProofsFetcherInterface {
  constructor(private readonly storageService: StorageService) {}

  async fetchProofs(address: string, epochToNumber?: number): Promise<Proofs[]> {
    const allProofs = await this.storageService.readAllProofs();
    const proofs = allProofs.reverse().filter((proofs) => !!proofs.proofs[address.toLowerCase()]?.amount);
    if (epochToNumber) {
      const ageEpoch = getEpochFromNumber(epochToNumber);
      if (!ageEpoch) throw Error(`Invalid epoch id ${epochToNumber}`);
      const epochIndex = proofs.findIndex((proof) => proof.epochNumber === ageEpoch.epoch.epochNumber);
      return proofs.slice(0, epochIndex + 1); // empty array if epochIndex === -1
    }
    return proofs;
  }

  getEpochFromNumber(epochNumber: number): EpochConfig {
    return getEpochFromNumber(epochNumber)!.epoch;
  }
}
