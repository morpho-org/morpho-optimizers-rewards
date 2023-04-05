export interface MarketsEmissionFs {
  age: string;
  epoch: string;
  epochNumber: number;
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
      morphoEmittedSupplySide: string;
      morphoRatePerSecondSupplySide: string;
      morphoRatePerSecondBorrowSide: string;
      morphoEmittedBorrowSide: string;
      totalMarketSizeSupplySide: string;
      totalMarketSizeBorrowSide: string;
    };
  };
}
