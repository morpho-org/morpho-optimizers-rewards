import { BigNumber } from "ethers";

export interface MarketEmission {
  /** Number of MORPHO emitted on the supply side of the market
   *
   * Number of decimals:
   * `18` _(WAD)_
   */
  morphoEmittedSupplySide: BigNumber;

  /** Number of MORPHO emitted per second on the supply side of the market
   *
   * Number of decimals:
   * `18` _(WAD)_
   */
  morphoRatePerSecondSupplySide: BigNumber;

  /** Number of MORPHO emitted on the borrow side of the market
   *
   * Number of decimals:
   * `18` _(WAD)_
   */
  morphoEmittedBorrowSide: BigNumber;

  /** Number of MORPHO emitted per second on the borrow side of the market
   *
   * Number of decimals:
   * `18` _(WAD)_
   */
  morphoRatePerSecondBorrowSide: BigNumber;

  /** the peer-to-peer cursor into the spread
   *  used during age1 for the MORPHO repartition between the supply and the borrow side
   *
   * Number of decimals:
   * `4` _(BASE_UNITS)_
   */
  p2pIndexCursor: BigNumber;

  /** Number of MORPHO emitted on the market
   *
   * Number of decimals:
   * `18` _(WAD)_
   */
  marketEmission: BigNumber;

  /** Total Morpho market size on the supply side of the market,
   * i.e. the total supplied at the snapshot block of the epoch
   *
   * Number of decimals:
   * `tokenDecimals` _(underlying)_
   */
  totalMarketSizeSupplySide: BigNumber;

  /** Total Morpho market size on the borrow side of the market,
   * i.e. the total borrowed at the snapshot block of the epoch
   *
   * Number of decimals:
   * `tokenDecimals` _(underlying)_
   */
  totalMarketSizeBorrowSide: BigNumber;

  /** The number of decimals of the underlying token */
  decimals: number;
}
