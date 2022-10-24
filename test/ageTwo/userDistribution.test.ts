import { ages, allEpochs } from "../../src";
import {
  computeMerkleTree,
  fetchUsers,
  getAccumulatedEmission,
  UserBalances,
  userBalancesToUnclaimedTokens,
} from "../../src/utils";
import { BigNumber, providers } from "ethers";
import { now, WAD } from "../../src/helpers";
import { parseUnits } from "ethers/lib/utils";
import { expectBNApproxEquals } from "../ageOne/epochOne.test";
import * as fs from "fs";

describe.each([0])("Age 2 users distribution", () => {
  const epochConfig = ages[1].epochs[0];
  const ageConfig = ages[1];
  let usersBalances: UserBalances[];
  let usersAccumulatedRewards: { address: string; accumulatedRewards: string }[];
  let onchainRoot: string;
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);

  beforeAll(async () => {
    usersBalances = await fetchUsers(ages[0].subgraphUrl, epochConfig.finalBlock);
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
        ), // with 18 * 2 decimals
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
      .reduce((acc, b) => acc.add(b), BigNumber.from(0));
    const totalEmittedInTheory = epochConfig.totalEmission.mul(WAD);
    expectBNApproxEquals(emitted, totalEmittedInTheory, 1e10);
    expect(epochConfig.finalBlock).not.toBeUndefined();
  });

  it(`should emit the correct number of tokens for all epochs to epoch ${epochConfig.id}`, async () => {
    const totalEmitted = usersAccumulatedRewards.reduce((a, b) => a.add(b.accumulatedRewards), BigNumber.from(0));
    const fromGraph = usersBalances
      .map((b) => b.balances.map((b2) => b2.accumulatedMorpho))
      .flat()
      .reduce((a, b) => a.add(b), BigNumber.from(0));
    const totalEpochsTokens = getAccumulatedEmission(epochConfig.id).mul(WAD);
    expectBNApproxEquals(totalEpochsTokens, totalEmitted, parseUnits("1"));
  });

  it(`Should should compute the correct root for epoch ${epochConfig.id}`, async () => {
    // remove users with 0 MORPHO to claim
    usersAccumulatedRewards = usersAccumulatedRewards.filter((b) => b.accumulatedRewards !== "0");
    const { root, proofs } = computeMerkleTree(usersAccumulatedRewards);
    await fs.promises.writeFile(
      `./distribution/proofs/proofs-${epochConfig.number}.json`,
      JSON.stringify({ epoch: epochConfig.id, root, proofs }, null, 4)
    );
    expect(root).toEqual(onchainRoot);
  });
  it(`Should sum proofs to the total token emmited for epoch ${epochConfig.id}`, async () => {
    // remove users with 0 MORPHO to claim
    usersAccumulatedRewards = usersAccumulatedRewards.filter((b) => b.accumulatedRewards !== "0");
    const { proofs } = computeMerkleTree(usersAccumulatedRewards);

    const totalEmitted = Object.values(proofs)
      .map((proof) => BigNumber.from(proof.amount))
      .reduce((acc, b) => acc.add(b), BigNumber.from(0));
    const totalEmittedTheorical = allEpochs
      .filter((epoch) => epoch.finalTimestamp.lt(now()))
      .reduce((acc, epoch) => acc.add(epoch.totalEmission.mul(WAD)), BigNumber.from(0));
    expectBNApproxEquals(totalEmitted, totalEmittedTheorical, parseUnits("1"));
  });
});
