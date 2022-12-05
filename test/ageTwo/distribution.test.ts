/* eslint-disable no-console */
import { ages } from "../../src";
import { BigNumber, providers } from "ethers";
import * as dotenv from "dotenv";
import { ageTwoDistribution } from "../../src/ages/distributions";
import { aStEth, cFei } from "../../src/helpers";
import { MarketEmission } from "../../src/utils";
import { Optional } from "../../src/helpers/types";
import { expectBNApproxEquals } from "../ageOne/epochOne.test";
dotenv.config();
describe.each([0, 1, 2])("Test the distribution of the second age", (epochIndex) => {
  const ageId = 1;
  const age = ages[ageId];
  const epoch = age.epochs[epochIndex];
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL, "mainnet");
  let marketsEmissions: Record<string, Optional<MarketEmission>> = {};
  beforeAll(async () => {
    ({ marketsEmissions } = await ageTwoDistribution(epoch, provider));
  });

  it(`Should not distribute tokens on Compound FEI for epoch ${epoch.id}`, async () => {
    expect(marketsEmissions[cFei]).toEqual(undefined); // no distribution for the fei token
  });

  it(`Should not distribute tokens to StEth borrowers on Aave for epoch ${epoch.id}`, async () => {
    expect(marketsEmissions[aStEth]?.borrowRate.isZero()).toEqual(true); // no borrowers of steth on aave
    expect(marketsEmissions[aStEth]?.borrow.isZero()).toEqual(true); // no borrowers of steth on aave
  });
  it(`Should distribute the correct number of MORPHO tokens for epoch ${epoch.id}`, async () => {
    const totalRewards = epoch.totalEmission;
    const duration = epoch.finalTimestamp.sub(epoch.initialTimestamp);
    const totalEmitted = Object.values(marketsEmissions).reduce(
      (acc, emission) => acc.add(emission!.borrowRate.add(emission!.supplyRate).mul(duration)),
      BigNumber.from(0)
    );
    expectBNApproxEquals(totalRewards, totalEmitted, 1e8);
  });
});
