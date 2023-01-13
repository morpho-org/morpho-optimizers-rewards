export interface MarketsEmission {
  age: string;
  epoch: string;
  totalEmission: string;
  snapshotProposal?: string;
  parameters: {
    snapshotBlock: string;
    initialTimestamp: string;
    finalTimestamp: string;
    duration: string;
  };
  markets: {
    [market: string]: {
      supply: string;
      supplyRate: string;
      borrowRate: string;
      borrow: string;
    };
  };
}
