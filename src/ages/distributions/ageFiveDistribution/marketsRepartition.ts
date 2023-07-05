/**
 * This distribution is extracted from the governance proposal
 *
 */
import { BigNumber } from "ethers";

const marketsRepartition = {
  // Morpho Aave V2 markets
  aDAI: {
    market: "0x028171bCA77440897B824Ca71D1c56caC55b68A3",
    weight: BigNumber.from(577),
  },
  aWETH: {
    market: "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e",
    weight: BigNumber.from(4587),
  },
  aUSDC: {
    market: "0xBcca60bB61934080951369a648Fb03DF4F96263C",
    weight: BigNumber.from(1906),
  },
  aUSDT: {
    market: "0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811",
    weight: BigNumber.from(945),
  },
  aWBTC: {
    market: "0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656",
    weight: BigNumber.from(1014),
  },
  // Morpho Compound markets
  cUSDT: {
    market: "0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9",
    weight: BigNumber.from(274),
  },
  // Morpho AaveV3 markets
  aWETHV3: {
    market: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // use WETH (underlying token) address as identifier
    weight: BigNumber.from(697),
  },
};

export default marketsRepartition;
