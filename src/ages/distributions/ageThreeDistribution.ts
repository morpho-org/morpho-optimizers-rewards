import { constants, providers } from "ethers";
import { EpochConfig } from "../ages.types";
import { AgeDistribution } from "./distributions.types";
import { parseUnits } from "ethers/lib/utils";
import fetchProposal from "../../utils/snapshot/fetchProposal";
import { weightedDistribution } from "./weightedDistribution";

export const ageThreeDistribution = async (
  ageConfig: AgeDistribution,
  { finalTimestamp, initialTimestamp, number, snapshotBlock, snapshotProposal, totalEmission }: EpochConfig,
  provider?: providers.Provider
) => {
  if (!snapshotBlock) throw Error(`Cannot distribute tokens for epoch ${number}: no snapshotBlock`);
  if (!snapshotProposal) throw Error(`Cannot distribute tokens for epoch ${number}: no snapshotProposal`);
  const proposal = await fetchProposal(snapshotProposal);

  if (proposal.state !== "closed")
    throw Error(`Cannot distribute tokens for epoch ${number}: proposal ${snapshotProposal} is not closed`);
  const duration = finalTimestamp.sub(initialTimestamp);

  const totalScoreBn = parseUnits(proposal.scores_total.toString());

  const getWeight = (symbol: string) => {
    const index = proposal.choices.indexOf(symbol);
    if (index === -1) return constants.Zero;
    const score = parseUnits(proposal.scores[index].toString());
    return score.mul(totalEmission).div(totalScoreBn);
  };

  const marketsEmissions = await weightedDistribution(
    Object.values(proposal.choices),
    getWeight,
    duration,
    snapshotBlock,
    provider
  );

  return { marketsEmissions };
};
