import { BigNumber, providers } from "ethers";
import {
  AavePriceOracle__factory,
  AToken__factory,
  CompoundOracle__factory,
  Comptroller__factory,
  CToken__factory,
  LendingPool__factory,
  LendingPoolAddressesProvider__factory,
  MorphoAaveV2__factory,
  MorphoAaveV2Lens__factory,
  MorphoCompound__factory,
  MorphoCompoundLens__factory,
  VariableDebtToken__factory,
} from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { Optional } from "../../helpers/types";
import { MarketMinimal } from "../../utils/graph/getGraphMarkets/markets.types";
import { BASIS_POINTS, cFei, pow10BN, WAD } from "../../helpers";
import { MarketEmission } from "../../utils";
import { EpochConfig } from "../ages.types";

export const ageTwoDistribution = async (epochConfig: EpochConfig, provider?: providers.Provider) => {
  if (!epochConfig.snapshotBlock) throw Error(`Cannot distribute tokens for epoch ${epochConfig.id}: no snapshotBlock`);
  provider ??= new providers.InfuraProvider("mainnet");
  const { aave, compound } = await getMarketsData(epochConfig.snapshotBlock, provider);
  const aaveTokens = epochConfig.totalEmission.mul(epochConfig.protocolDistribution.morphoAave).div(BASIS_POINTS);
  const compoundTokens = epochConfig.totalEmission.sub(aaveTokens);
  const duration = epochConfig.finalTimestamp.sub(epochConfig.initialTimestamp);
  const aaveDistribution = distributeTokens(aave, aaveTokens, duration);
  const compoundDistribution = distributeTokens(compound, compoundTokens, duration);
  return {
    marketsEmissions: { ...aaveDistribution, ...compoundDistribution },
    marketsParameters: [...aave, ...compound],
  };
};

const distributeTokens = (marketsData: MarketMinimal[], distribution: BigNumber, duration: BigNumber) => {
  const totalSupply = marketsData.reduce((acc, market) => acc.add(market.totalSupply), BigNumber.from(0));
  const totalBorrow = marketsData.reduce((acc, market) => acc.add(market.totalBorrow), BigNumber.from(0));
  const total = totalBorrow.add(totalSupply);
  const marketsEmissions: {
    [market: string]: Optional<MarketEmission>;
  } = {};
  marketsData.forEach((marketData) => {
    const supply = marketData.totalSupply.mul(distribution).div(total);
    const supplyRate = supply.div(duration);
    const borrow = marketData.totalBorrow.mul(distribution).div(total);
    const borrowRate = borrow.div(duration);
    const marketEmission = supply.add(borrow);
    marketsEmissions[marketData.address.toLowerCase()] = {
      supply,
      supplyRate,
      borrow,
      borrowRate,
      marketEmission,
      p2pIndexCursor: marketData.p2pIndexCursor,
      morphoBorrow: marketData.totalBorrow,
      morphoSupply: marketData.totalSupply,
    };
  });
  return marketsEmissions;
};

const getMarketsData = async (snapshotBlock: providers.BlockTag, provider: providers.Provider) => {
  const [compoundParameters, aaveParameters] = await Promise.all([
    getCompoundMarketsParameters(snapshotBlock, provider),
    getAaveMarketsParameters(snapshotBlock, provider),
  ]);

  return {
    compound: compoundParameters,
    aave: aaveParameters,
  };
};
const getAaveMarketsParameters = async (snapshotBlock: providers.BlockTag, provider: providers.Provider) => {
  const overrides = { blockTag: snapshotBlock };
  const morpho = MorphoAaveV2__factory.connect(addresses.morphoAave.morpho, provider);
  const lens = MorphoAaveV2Lens__factory.connect(addresses.morphoAave.lens, provider);
  const lendingPool = LendingPool__factory.connect(await morpho.pool(overrides), provider);
  const addressesProvider = LendingPoolAddressesProvider__factory.connect(
    await lendingPool.getAddressesProvider(overrides),
    provider
  );
  const oracle = AavePriceOracle__factory.connect(await addressesProvider.getPriceOracle(overrides), provider);

  const allMarkets = await morpho.getMarketsCreated(overrides);

  return Promise.all(
    allMarkets.map(async (market) => {
      const aToken = AToken__factory.connect(market, provider);
      const [
        underlying,
        decimals,
        totalSupply,
        { poolBorrowAmount, poolSupplyAmount, p2pSupplyAmount, p2pBorrowAmount },
      ] = await Promise.all([
        aToken.UNDERLYING_ASSET_ADDRESS(overrides),
        aToken.decimals(overrides),
        aToken.totalSupply(overrides),
        lens.getMainMarketData(market, overrides),
      ]);
      const { variableDebtTokenAddress } = await lendingPool.getReserveData(underlying, overrides);
      const debtToken = VariableDebtToken__factory.connect(variableDebtTokenAddress, provider);
      const [totalBorrow, price, { p2pIndexCursor }] = await Promise.all([
        debtToken.totalSupply(overrides),
        oracle.getAssetPrice(underlying, overrides),
        lens.getMarketConfiguration(market, overrides),
      ]);
      const marketParameters: MarketMinimal = {
        address: market,
        totalSupply: totalSupply.mul(price).div(pow10BN(decimals)),
        totalBorrow: totalBorrow.mul(price).div(pow10BN(decimals)),
        totalMorphoBorrow: poolBorrowAmount.add(p2pBorrowAmount),
        totalMorphoSupply: poolSupplyAmount.add(p2pSupplyAmount),
        price,
        p2pIndexCursor: BigNumber.from(p2pIndexCursor),
      };
      return marketParameters;
    })
  );
};
const getCompoundMarketsParameters = async (snapshotBlock: providers.BlockTag, provider: providers.Provider) => {
  const morpho = MorphoCompound__factory.connect(addresses.morphoCompound.morpho, provider);
  const lens = MorphoCompoundLens__factory.connect(addresses.morphoCompound.lens, provider);
  const overrides = { blockTag: snapshotBlock };
  const allMarkets = await morpho
    .getAllMarkets(overrides)
    .then((r) => r.filter((market) => market.toLowerCase() !== cFei));
  const comptroller = Comptroller__factory.connect(await morpho.comptroller(overrides), provider);
  const oracle = CompoundOracle__factory.connect(await comptroller.oracle(overrides), provider);

  return await Promise.all(
    allMarkets.map(async (market) => {
      market = market.toLowerCase();
      const cToken = CToken__factory.connect(market, provider);
      const [
        totalSupplyRaw,
        supplyIndex,
        totalBorrow,
        price,
        { p2pIndexCursor },
        { p2pBorrowAmount, p2pSupplyAmount, poolBorrowAmount, poolSupplyAmount },
      ] = await Promise.all([
        cToken.totalSupply(overrides),
        cToken.exchangeRateStored(overrides),
        cToken.totalBorrows(overrides),
        oracle.getUnderlyingPrice(market, overrides),
        morpho.marketParameters(market, overrides),
        lens.getMainMarketData(market, overrides),
      ]);
      const totalSupply = totalSupplyRaw.mul(supplyIndex).div(WAD);
      const marketParameters: MarketMinimal = {
        address: market,
        totalSupply: totalSupply.mul(price).div(WAD),
        totalBorrow: totalBorrow.mul(price).div(WAD),
        totalMorphoSupply: p2pSupplyAmount.add(poolSupplyAmount),
        totalMorphoBorrow: p2pBorrowAmount.add(poolBorrowAmount),
        price,
        p2pIndexCursor: BigNumber.from(p2pIndexCursor),
      };
      return marketParameters;
    })
  );
};
