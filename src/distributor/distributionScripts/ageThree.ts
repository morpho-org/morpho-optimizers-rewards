import { DistributionFn, DistributionParams } from "./common";
import { BigNumber, constants } from "ethers";
import fetchProposal from "../../utils/snapshot/fetchProposal";
import { parseUnits } from "ethers/lib/utils";
import { weightedDistribution } from "../../ages/distributions/weightedDistribution";

export interface AgeThreeParams extends DistributionParams {
  snapshotProposal: string;
}

const ageThree = async ({
  finalTimestamp,
  initialTimestamp,
  snapshotBlock,
  snapshotProposal,
  totalEmission,
  provider,
  id,
}: AgeThreeParams) => {
  if (!snapshotProposal) throw Error(`Cannot distribute tokens for ${id}: no snapshotProposal`);
  const proposal = await fetchProposal(snapshotProposal);

  if (proposal.state !== "closed")
    throw Error(`Cannot distribute tokens for epoch ${id}: proposal ${snapshotProposal} is not closed`);
  const duration = BigNumber.from(finalTimestamp - initialTimestamp);

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

export default ageThree;
