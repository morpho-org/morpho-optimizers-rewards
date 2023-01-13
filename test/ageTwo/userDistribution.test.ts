import { ages, allEpochs } from "../../src";
import {
  computeMerkleTree,
  fetchUsers,
  getAccumulatedEmission,
  UserBalances,
  userBalancesToUnclaimedTokens,
} from "../../src/utils";
import { BigNumber, constants, providers } from "ethers";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { expectBNApproxEquals } from "../ageOne/epochOne.test";
import { SUBGRAPH_URL } from "../../src/config";

describe.each([0, 1])("Age 2 users distribution", (epochId) => {
  const epochConfig = ages[1].epochs[epochId];
  const ageConfig = ages[1];
  let usersBalances: UserBalances[];
  let usersAccumulatedRewards: { address: string; accumulatedRewards: string }[];
  let onchainRoot: string;
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);

  beforeAll(async () => {
    usersBalances = await fetchUsers(SUBGRAPH_URL, epochConfig.finalBlock);
    try {
      // fetch root from proofs
      onchainRoot = require(`../../distribution/proofs/proofs-${epochConfig.number}.json`).root;
    } catch (e) {
      onchainRoot = "";
    }
    usersAccumulatedRewards = await Promise.all(
      usersBalances.map(async ({ address, balances }) => ({
        address,
        accumulatedRewards: await userBalancesToUnclaimedTokens(balances, epochConfig.finalTimestamp, provider).then(
          (r) => r.toString()
        ), // with 18 decimals
      }))
    );
  });

  it(`Should be finished and have final block for epoch ${epochConfig.id}`, async () => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    expect(epochConfig.finalTimestamp.lt(currentTimestamp)).toBe(true);
    expect(epochConfig.finalBlock).not.toBeUndefined();
  });
  it(`Should distribute the correct number of tokens for epoch ${epochConfig.id}`, async () => {
    const distribution = require(`../../distribution/${ageConfig.ageName}/${epochConfig.epochName}/marketsEmission.json`);
    const duration = BigNumber.from(distribution.parameters.duration);
    const emitted = (Object.values(distribution.markets) as { supplyRate: string; borrowRate: string }[])
      .map((market) => BigNumber.from(market.supplyRate).add(market.borrowRate).mul(duration))
      .reduce((acc, b) => acc.add(b), constants.Zero);
    const totalEmittedInTheory = epochConfig.totalEmission;
    expectBNApproxEquals(emitted, totalEmittedInTheory, 1e10);
    expect(epochConfig.finalBlock).not.toBeUndefined();
  });

  it(`should emit the correct number of tokens for all epochs to epoch ${epochConfig.id}`, async () => {
    const totalEmitted = usersAccumulatedRewards.reduce((a, b) => a.add(b.accumulatedRewards), constants.Zero);

    const totalEpochsTokens = getAccumulatedEmission(epochConfig.id);
    console.log(formatUnits(totalEpochsTokens), formatUnits(totalEmitted));
    expectBNApproxEquals(totalEpochsTokens, totalEmitted, parseUnits("1"));
  });

  it(`Should should compute the correct root for epoch ${epochConfig.id}`, async () => {
    // remove users with 0 MORPHO to claim
    usersAccumulatedRewards = usersAccumulatedRewards.filter((b) => b.accumulatedRewards !== "0");
    const { root } = computeMerkleTree(usersAccumulatedRewards);
    expect(root).toEqual(onchainRoot);
  });
  it(`Should sum proofs to the total token emmited for epoch ${epochConfig.id}`, async () => {
    // remove users with 0 MORPHO to claim
    usersAccumulatedRewards = usersAccumulatedRewards.filter((b) => b.accumulatedRewards !== "0");
    const { proofs } = computeMerkleTree(usersAccumulatedRewards);

    const totalEmitted = Object.values(proofs)
      .map((proof) => BigNumber.from(proof.amount))
      .reduce((acc, b) => acc.add(b), constants.Zero);
    const totalEmittedTheorical = allEpochs
      .filter((epoch) => epoch.finalTimestamp.lte(epochConfig.finalTimestamp))
      .reduce((acc, epoch) => acc.add(epoch.totalEmission), constants.Zero);
    expectBNApproxEquals(totalEmitted, totalEmittedTheorical, parseUnits("1"));
  });
});
