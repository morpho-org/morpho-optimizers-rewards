import { BigNumber, providers } from "ethers";
import {
  AavePriceOracle__factory,
  AToken__factory,
  CompoundOracle__factory,
  Comptroller__factory,
  CToken__factory,
  ERC20__factory,
  LendingPool__factory,
  LendingPoolAddressesProvider__factory,
  MorphoAaveV2__factory,
  MorphoAaveV2Lens__factory,
  MorphoCompound__factory,
  MorphoCompoundLens__factory,
  VariableDebtToken__factory,
} from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { MarketMinimal } from "../graph/getGraphMarkets/markets.types";
import { cFei, pow10BN, WAD } from "../../helpers";
import tokens from "@morpho-labs/morpho-ethers-contract/lib/tokens";
import { getAddress } from "ethers/lib/utils";

const fetchMarketsData = async (snapshotBlock: providers.BlockTag, provider: providers.Provider) => {
  const [compoundParameters, aaveParameters] = await Promise.all([
    getCompoundMarketsParameters(snapshotBlock, provider),
    getAaveMarketsParameters(snapshotBlock, provider),
  ]);

  return {
    compound: compoundParameters,
    aave: aaveParameters,
    markets: [...compoundParameters, ...aaveParameters],
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
      const [underlying, decimals, totalPoolSupply] = await Promise.all([
        aToken.UNDERLYING_ASSET_ADDRESS(overrides),
        aToken.decimals(overrides),
        aToken.totalSupply(overrides),
      ]);
      const { variableDebtTokenAddress } = await lendingPool.getReserveData(underlying, overrides);
      const debtToken = VariableDebtToken__factory.connect(variableDebtTokenAddress, provider);
      const [
        totalPoolBorrow,
        price,
        { p2pIndexCursor },
        { p2pBorrowAmount, poolBorrowAmount, p2pSupplyAmount, poolSupplyAmount },
      ] = await Promise.all([
        debtToken.totalSupply(overrides),
        oracle.getAssetPrice(underlying, overrides),
        lens.getMarketConfiguration(market, overrides),
        lens.getMainMarketData(market, overrides),
      ]);
      const marketParameters: MarketMinimal = {
        address: market,
        totalPoolSupplyUSD: totalPoolSupply.mul(price).div(pow10BN(decimals)),
        totalPoolBorrowUSD: totalPoolBorrow.mul(price).div(pow10BN(decimals)),
        morphoSupplyMarketSize: p2pSupplyAmount.add(poolSupplyAmount),
        morphoBorrowMarketSize: p2pBorrowAmount.add(poolBorrowAmount),
        price,
        p2pIndexCursor: BigNumber.from(p2pIndexCursor),
        decimals,
      };
      return marketParameters;
    })
  );
};
const getCompoundMarketsParameters = async (snapshotBlock: providers.BlockTag, provider: providers.Provider) => {
  const morpho = MorphoCompound__factory.connect(addresses.morphoCompound.morpho, provider);
  const overrides = { blockTag: snapshotBlock };
  const allMarkets = await morpho
    .getAllMarkets(overrides)
    .then((r) => r.filter((market) => market.toLowerCase() !== cFei));
  const comptroller = Comptroller__factory.connect(await morpho.comptroller(overrides), provider);
  const oracle = CompoundOracle__factory.connect(await comptroller.oracle(overrides), provider);
  const lens = MorphoCompoundLens__factory.connect(addresses.morphoCompound.lens, provider);

  return await Promise.all(
    allMarkets.map(async (market) => {
      market = market.toLowerCase();
      const cToken = CToken__factory.connect(market, provider);
      const [
        totalSupplyRaw,
        supplyIndex,
        totalPoolBorrow,
        price,
        { p2pIndexCursor },
        { p2pBorrowAmount, poolBorrowAmount, p2pSupplyAmount, poolSupplyAmount },
        underlying,
      ] = await Promise.all([
        cToken.totalSupply(overrides),
        cToken.exchangeRateStored(overrides),
        cToken.totalBorrows(overrides),
        oracle.getUnderlyingPrice(market, overrides),
        morpho.marketParameters(market, overrides),
        lens.getMainMarketData(market, overrides),
        getAddress(market) === getAddress(tokens.wEth.cToken!) ? tokens.wEth.address : cToken.underlying(),
      ]);

      const decimals = await ERC20__factory.connect(underlying, provider).decimals(overrides);
      const totalPoolSupply = totalSupplyRaw.mul(supplyIndex).div(WAD);
      const marketParameters: MarketMinimal = {
        address: market,
        totalPoolSupplyUSD: totalPoolSupply.mul(price).div(WAD),
        totalPoolBorrowUSD: totalPoolBorrow.mul(price).div(WAD),
        price,
        morphoSupplyMarketSize: p2pSupplyAmount.add(poolSupplyAmount),
        morphoBorrowMarketSize: p2pBorrowAmount.add(poolBorrowAmount),
        p2pIndexCursor: BigNumber.from(p2pIndexCursor),
        decimals,
      };
      return marketParameters;
    })
  );
};

export default fetchMarketsData;
