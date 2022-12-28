import { providers } from "ethers";
import { EpochConfig } from "../ages.types";
import { AgeDistribution } from "./distributions.types";
import tokens from "@morpho-labs/morpho-ethers-contract/lib/tokens";
import { parseUnits } from "ethers/lib/utils";
import getMarketsData from "../../utils/markets/getMarketsData";
import fetchProposal from "../../utils/snapshot/fetchProposal";
import { MarketEmission } from "../../utils";

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

export const ageThreeDistribution = async (
  ageConfig: AgeDistribution,
  epochConfig: EpochConfig,
  provider?: providers.Provider
) => {
  if (!epochConfig.snapshotBlock) throw Error(`Cannot distribute tokens for epoch ${epochConfig.id}: no snapshotBlock`);
  if (!epochConfig.snapshotProposal)
    throw Error(`Cannot distribute tokens for epoch ${epochConfig.id}: no snapshotProposal`);
  const proposal = await fetchProposal(epochConfig.snapshotProposal);
  if (proposal.state !== "closed")
    throw Error(
      `Cannot distribute tokens for epoch ${epochConfig.id}: proposal ${epochConfig.snapshotProposal} is not closed`
    );
  const duration = epochConfig.finalTimestamp.sub(epochConfig.initialTimestamp);
  const { markets } = await getMarketsData(epochConfig.snapshotBlock, provider!);
  const totalScoreBn = parseUnits(proposal.scores_total);
  const marketsEmissions = Object.fromEntries(
    proposal.scores.map((score, index) => {
      const symbol = proposal.choices[index];
      const address = MARKETS[symbol as keyof typeof MARKETS];
      if (!address) throw Error(`Cannot distribute tokens for epoch ${epochConfig.id}: unknown market ${symbol}`);
      const marketData = markets.find((market) => market.address.toLowerCase() === address.toLowerCase());
      if (!marketData)
        throw Error(`Cannot distribute tokens for epoch ${epochConfig.id}: no market data for ${symbol}`);
      const scoreBn = parseUnits(score.toString());
      const distribution = epochConfig.totalEmission.mul(scoreBn).div(totalScoreBn);
      const total = marketData.totalMorphoSupply.add(marketData.totalMorphoBorrow);
      const supply = marketData.totalMorphoSupply.mul(distribution).div(total);
      const supplyRate = supply.div(duration);
      const borrow = marketData.totalMorphoBorrow.mul(distribution).div(total);
      const borrowRate = borrow.div(duration);
      const marketEmission = supply.add(borrow);
      return [
        address.toLowerCase(),
        {
          supply,
          supplyRate,
          borrow,
          borrowRate,
          marketEmission,
          morphoBorrow: marketData.totalMorphoBorrow,
          morphoSupply: marketData.totalMorphoSupply,
          p2pIndexCursor: marketData.p2pIndexCursor,
        } as MarketEmission,
      ];
    })
  );
  return { marketsEmissions };
};
