import { ages } from "../src";
import { getMarketsDistribution } from "../src/utils/getEpochMarketsDistribution";
import { providers } from "ethers";
import { MarketEmission } from "../src/utils";
import { Optional } from "../src/helpers/types";

describe.each(ages)("Test Ages Distributions", (age) => {
  const EPOCHS_PER_AGE = 3;
  const ts = Math.floor(Date.now() / 1000);
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
  it(`Should have the correct configuration for ${age.ageName}`, () => {
    expect(age.ageName).not.toBeUndefined();
    expect(age.epochs).toHaveLength(EPOCHS_PER_AGE);
    expect(age.startTimestamp).not.toBeUndefined();
    expect(age.endTimestamp).not.toBeUndefined();
  });
  it(`Should have consistent timestamps for ${age.ageName}`, () => {
    const firstEpoch = age.epochs[0];
    const lastEpoch = age.epochs[2];
    expect(age.startTimestamp).toBnEq(firstEpoch.initialTimestamp);
    expect(age.endTimestamp).toBnEq(lastEpoch.finalTimestamp);
  });

  it(`Should return a market configuration for ${age.ageName}`, async () => {
    const marketEmission = await getMarketsDistribution(age.startTimestamp.toNumber());
    expect(marketEmission).not.toBeUndefined();
  });

  describe.each(age.epochs)(`Test each epochs of ${age.ageName}`, (epochConfig) => {
    if (epochConfig.initialTimestamp.lt(ts)) {
      it(`Should have a snapshot block for ${epochConfig.id}`, () => {
        expect(epochConfig.snapshotBlock).not.toBeUndefined();
      });
      it(`Should have an initial block for ${epochConfig.id}`, () => {
        expect(epochConfig.initialBlock).not.toBeUndefined();
      });

      it(`Should have a distribution computed for ${epochConfig.id}`, () => {
        let file: object | undefined = undefined;
        try {
          file = require(`../distribution/${age.ageName}/${epochConfig.epochName}/marketsEmission.json`);
        } catch (e) {
          console.error(e);
        }
        expect(file).not.toBeUndefined();
      });

      describe(`Distribution for ${epochConfig.id}`, () => {
        let marketsEmissions: { [p: string]: Optional<MarketEmission> } = {};
        let file: any = {};
        beforeAll(async () => {
          file = require(`../distribution/${age.ageName}/${epochConfig.epochName}/marketsEmission.json`);

          ({ marketsEmissions } = await age.distribution(age, epochConfig, provider));
        });
        it(`Should have a correct number of markets computed for ${epochConfig.id}`, async () => {
          expect(Object.values(marketsEmissions).length).toEqual(Object.values(file.markets).length);
        });
        it(`Should have the correct markets computed for ${epochConfig.id}`, async () => {
          expect(Object.keys(marketsEmissions)).toEqual(Object.keys(file.markets));
        });
        it(`Should have the correct supply rates computed for ${epochConfig.id}`, async () => {
          Object.entries(marketsEmissions).forEach(([market, emission]) =>
            expect(emission!.supplyRate.toString()).toEqual(file.markets[market].supplyRate)
          );
        });
        it(`Should have the correct borrow rates computed for ${epochConfig.id}`, async () => {
          Object.entries(marketsEmissions).forEach(([market, emission]) =>
            expect(emission!.supplyRate.toString()).toEqual(file.markets[market].supplyRate)
          );
        });
      });
    }
    if (epochConfig.finalTimestamp.lt(ts)) {
      it(`Should have a final block for ${epochConfig.id}`, () => {
        expect(epochConfig.finalBlock).not.toBeUndefined();
      });
    }
  });
});
