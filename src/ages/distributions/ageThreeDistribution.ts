import { constants, providers } from "ethers";
import { DistributionFn, EpochConfig } from "../ages.types";
import { AgeDistribution } from "./distributions.types";
import { parseUnits } from "ethers/lib/utils";
import fetchProposal from "../../utils/snapshot/fetchProposal";
import { weightedDistribution } from "./weightedDistribution";

export const ageThreeDistribution: DistributionFn = async (
  ageConfig: AgeDistribution,
  { finalTimestamp, initialTimestamp, epochNumber, snapshotBlock, snapshotProposal, totalEmission }: EpochConfig,
  provider?: providers.Provider
) => {
  if (!snapshotBlock) throw Error(`Cannot distribute tokens for epoch ${epochNumber}: no snapshotBlock`);
  if (!snapshotProposal) throw Error(`Cannot distribute tokens for epoch ${epochNumber}: no snapshotProposal`);
  const proposal = await fetchProposal(snapshotProposal);

  if (proposal.state !== "closed")
    throw Error(`Cannot distribute tokens for epoch ${epochNumber}: proposal ${snapshotProposal} is not closed`);
  const duration = finalTimestamp.sub(initialTimestamp);

  const totalScoreBn = parseUnits(proposal.scores_total.toString());

  const getMarketEmissionRate = (symbol: string) => {
    const index = proposal.choices.indexOf(symbol);
    if (index === -1) return constants.Zero;
    const score = parseUnits(proposal.scores[index].toString());
    return score.mul(totalEmission).div(totalScoreBn);
  };

  const marketsEmissions = await weightedDistribution(
    Object.values(proposal.choices),
    getMarketEmissionRate,
    duration,
    snapshotBlock,
    provider
  );

  return { marketsEmissions };
};
