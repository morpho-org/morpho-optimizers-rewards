import { BigNumber } from "ethers";

const marketsRepartition = {
  // Morpho Aave V2 markets
  aDAI: {
    market: "0x028171bCA77440897B824Ca71D1c56caC55b68A3",
    weight: BigNumber.from(484),
  },
  aWETH: {
    market: "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e",
    weight: BigNumber.from(4227),
  },
  aUSDC: {
    market: "0xBcca60bB61934080951369a648Fb03DF4F96263C",
    weight: BigNumber.from(1049),
  },
  aUSDT: {
    market: "0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811",
    weight: BigNumber.from(846),
  },
  aWBTC: {
    market: "0x028171bca77440897b824ca71d1c56cac55b68a3",
    weight: BigNumber.from(1001),
  },
  aSTETH: {
    market: "0x1982b2F5814301d4e9a8b0201555376e62F82428",
    weight: BigNumber.from(809),
  },
  aCRV: {
    market: "0x8dAE6Cb04688C62d939ed9B68d32Bc62e49970b1",
    weight: BigNumber.from(117),
  },
  // Morpho Compound markets
  cDAI: {
    market: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
    weight: BigNumber.from(336),
  },

  cCOMP: {
    market: "0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4",
    weight: BigNumber.from(4),
  },
  cETH: {
    market: "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5",
    weight: BigNumber.from(278),
  },
  cUNI: {
    market: "0x35A18000230DA775CAc24873d00Ff85BccdeD550",
    weight: BigNumber.from(15),
  },
  cUSDC: {
    market: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
    weight: BigNumber.from(382),
  },
  cUSDT: {
    market: "0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9",
    weight: BigNumber.from(257),
  },
  cWBTC: {
    market: "0xccF4429DB6322D5C611ee964527D42E5d685DD6a",
    weight: BigNumber.from(195),
  },
};

export default marketsRepartition;
