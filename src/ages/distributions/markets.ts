import tokens from "@morpho-labs/morpho-ethers-contract/lib/tokens";

const MARKETS = {
  cDAI: tokens.dai.cToken!,
  cUSDC: tokens.usdc.cToken!,
  cUSDT: tokens.usdt.cToken!,
  cWBTC: tokens.wBtc.cToken!,
  cETH: tokens.wEth.cToken!,
  cCOMP: tokens.comp.cToken!,
  cUNI: tokens.uni.cToken!,
  aDAI: tokens.dai.aToken!,
  aUSDC: tokens.usdc.aToken!,
  aUSDT: tokens.usdt.aToken!,
  aWBTC: tokens.wBtc.aToken!,
  aWETH: tokens.wEth.aToken!,
  aCRV: tokens.crv.aToken!,
  aSTETH: tokens.stEth.aToken!,
};

export default MARKETS;
