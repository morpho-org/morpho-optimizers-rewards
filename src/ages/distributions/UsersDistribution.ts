export interface UsersDistribution {
  age: string;
  epoch: string;
  epochNumber: number;
  totalEmissionInitial: string;
  totalDistributed: string;
  distribution: {
    address: string;
    accumulatedRewards: string;
  }[];
}
