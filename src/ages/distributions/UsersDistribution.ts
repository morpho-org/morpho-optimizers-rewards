export interface UsersDistribution {
  epochId: string;
  totalEmissionInitial: string;
  totalDistributed: string;
  distribution: {
    address: string;
    accumulatedRewards: string;
  }[];
}
