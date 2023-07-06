export interface MarketsEmissionFs {
  epochId: string;
  totalEmission: string;
  snapshotProposal?: string;
  parameters: {
    snapshotBlock: number;
    initialTimestamp: number;
    finalTimestamp: number;
    duration: number;
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
