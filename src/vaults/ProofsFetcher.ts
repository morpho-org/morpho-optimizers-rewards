import { allEpochs, getEpoch } from "../ages";
import { Proofs } from "../ages/distributions/Proofs";
import { StorageService } from "../utils/StorageService";

export interface ProofsFetcherInterface {
  fetchProofs: (address: string, epochToId?: string) => Promise<Proofs[]>;
}

export default class ProofsFetcher implements ProofsFetcherInterface {
  constructor(private readonly storageService: StorageService) {}

  async fetchProofs(address: string, epochToId?: string): Promise<Proofs[]> {
    const [allProofs, epochs] = await Promise.all([this.storageService.readAllProofs(), allEpochs()]);
    const proofs = allProofs
      .sort((a, b) => {
        const epochA = epochs.find((epoch) => epoch.id === a.epochId);
        const epochB = epochs.find((epoch) => epoch.id === b.epochId);
        if (!epochA || !epochB) throw Error(`Invalid epoch id ${a.epochId} or ${b.epochId}`);
        return epochA.initialTimestamp - epochB.initialTimestamp;
      })
      .filter((proofs) => !!proofs.proofs[address.toLowerCase()]?.amount);

    if (epochToId) {
      const ageEpoch = await getEpoch(epochToId);
      if (!ageEpoch) throw Error(`Invalid epoch id ${epochToId}`);
      const epochIndex = proofs.findIndex((proof) => proof.epochId === ageEpoch.id);
      return proofs.slice(0, epochIndex); // empty array if epochIndex === -1
    }
    return proofs;
  }
}
