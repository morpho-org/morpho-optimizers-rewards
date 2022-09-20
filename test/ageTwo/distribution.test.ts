/* eslint-disable no-console */
import { ages } from "../../src";
import { BigNumber, providers } from "ethers";
import * as dotenv from "dotenv";
import { ageTwoDistribution } from "../../src/ages/distributions";
import { aStEth, cFei } from "../../src/helpers";
import { MarketEmission } from "../../lib/utils";
import { Optional } from "../../lib/helpers/types";
import { expectBNApproxEquals } from "../ageOne/epochOne.test";
import { WAD } from "../../lib/helpers";
import { formatUnits } from "ethers/lib/utils";
dotenv.config();
describe("Test the distribution of the second age", () => {
  const age = ages[1];
  const epochIndex = 0;
  const epoch = age.epochs[epochIndex];
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL, "mainnet");
  let marketsEmissions: { [p: string]: Optional<MarketEmission> } = {};
  beforeAll(async () => {
    ({ marketsEmissions } = await ageTwoDistribution(age.epochs[epochIndex], provider));
    const readableMarketEmissions = Object.fromEntries(
      Object.entries(marketsEmissions).map(([market, parameters]) => [
        market,
        parameters
          ? {
              supply: formatUnits(parameters.supply),
              supplyRate: parameters.supplyRate.toString(),
              borrow: formatUnits(parameters.borrow),
              borrowRate: parameters.borrowRate.toString(),
              marketEmission: formatUnits(parameters.marketEmission),
              p2pIndexCursor: formatUnits(parameters.p2pIndexCursor, 4),
            }
          : {},
      ])
    );
    console.log(
      JSON.stringify(
        {
          age: age.ageName,
          epoch: epoch.epochName,
          totalEmission: epoch.totalEmission.toString(),
          parameters: {
            snapshotBlock: epoch.snapshotBlock,
            initialTimestamp: epoch.initialTimestamp.toString(),
            finalTimestamp: epoch.finalTimestamp.toString(),
            duration: epoch.finalTimestamp.sub(epoch.initialTimestamp).toString(),
          },
          markets: readableMarketEmissions,
        },
        null,
        2
      )
    );
  });

  it("Should not distribute tokens on Compound FEI", async () => {
    expect(marketsEmissions[cFei]).toEqual(undefined); // no distribution for the fei token
  });

  it("Should not distribute tokens to StEth borrowers on Aave", async () => {
    expect(marketsEmissions[aStEth]?.borrowRate.isZero()).toEqual(true); // no borrowers of steth on aave
    expect(marketsEmissions[aStEth]?.borrow.isZero()).toEqual(true); // no borrowers of steth on aave
  });
  it("Should distribute the correct number of MORPHO tokens", async () => {
    const totalRewards = age.epochs[epochIndex].totalEmission;
    const duration = age.epochs[epochIndex].finalTimestamp.sub(age.epochs[epochIndex].initialTimestamp);
    const totalEmitted = Object.values(marketsEmissions).reduce(
      (acc, emission) => acc.add(emission!.borrowRate.add(emission!.supplyRate).mul(duration)),
      BigNumber.from(0)
    );
    expectBNApproxEquals(totalRewards.mul(WAD), totalEmitted, 1e8);
  });
});
