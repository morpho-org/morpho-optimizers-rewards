export interface UsersDistribution {
  age: string;
  epoch: string;
  totalEmissionInitial: string;
  totalDistributed: string;
  distribution: {
    address: string;
    accumulatedRewards: string;
  }[];
}
