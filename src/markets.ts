import { BigNumber, Contract, providers } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import * as dotenv from "dotenv";
import { Market } from "./types";
dotenv.config();

const morphoAddress = "0x8888882f8f843896699869179fb6e4f7e3b58888";
const lensAddress = "0xe8cfa2edbdc110689120724c4828232e473be1b2";
const provider = new providers.JsonRpcProvider(process.env.RPC_URL, 1);

const lens = new Contract(lensAddress, require("../abis/Lens.json"), provider);

export const getMarketsConfiguration = async (blockTag: number) => {
  const morpho = new Contract(
    morphoAddress,
    require("../abis/Morpho.json"),
    provider
  );
  const markets: string[] = await morpho.getAllMarkets();
  const comptroller = new Contract(
    await morpho.comptroller(),
    require("../abis/Comptroller.json"),
    provider
  );

  const oracle = new Contract(
    await comptroller.oracle(),
    require("../abis/Oracle.json"),
    provider
  );

  const marketsConfiguration: { [market: string]: Market } = {};

  await Promise.all(
    markets.map(async (marketAddress) => {
      console.log("market", marketAddress);
      const price = await oracle.getUnderlyingPrice(marketAddress, {
        blockTag,
      });
      const { p2pIndexCursor } = await morpho.marketParameters(marketAddress, {
        blockTag,
      });

      const cToken = new Contract(
        marketAddress,
        require("../abis/CToken.json"),
        provider
      );
      const totalCTokenSupply = await cToken.totalSupply({ blockTag });
      const exchangeRate = await cToken.exchangeRateStored({ blockTag });
      const totalBorrow = await cToken.totalBorrows({ blockTag });

      marketsConfiguration[marketAddress.toLowerCase()] = {
        address: marketAddress.toLowerCase(),
        price,
        p2pIndexCursor,
        totalBorrow,
        totalSupply: totalCTokenSupply.mul(exchangeRate).div(parseUnits("1")),
      };
    })
  );
  return marketsConfiguration;
};

export const getUserBalances = async (
  user: string,
  market: string,
  blockTag: number
) => {
  const { totalBalance: underlyingSupplyBalance } =
    await lens.getUpdatedUserSupplyBalance(user, market, { blockTag });
  const { totalBalance: underlyingBorrowBalance } =
    await lens.getUpdatedUserBorrowBalance(user, market, { blockTag });
  console.log(
    user,
    market,
    underlyingBorrowBalance.toString(),
    underlyingSupplyBalance.toString()
  );
  return {
    underlyingSupplyBalance,
    underlyingBorrowBalance,
  };
};
