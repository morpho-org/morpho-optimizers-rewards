import { ages } from "../src";
import { getMarketsDistribution } from "../src/utils/getEpochMarketsDistribution";
import { providers } from "ethers";
import { MarketEmission } from "../src/utils";
import { Optional } from "../src/helpers/types";
import { aStEth, cFei } from "../src/helpers";
import { FileSystemStorageService } from "../src/utils/StorageService";
import { MarketsEmissionFs } from "../src/ages/distributions/MarketsEmissionFs";

const storageService = new FileSystemStorageService();

describe.each(ages)("Test Ages Distributions", (age) => {
  const EPOCHS_PER_AGE = ages.indexOf(age) < 3 ? 3 : 1;
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
    const lastEpoch = age.epochs[age.epochs.length - 1];
    expect(age.startTimestamp).toBnEq(firstEpoch.initialTimestamp);
    expect(age.endTimestamp).toBnEq(lastEpoch.finalTimestamp);
  });

  if (age.startTimestamp.lt(ts)) {
    it(`Should return a market configuration for ${age.ageName}`, async () => {
      const marketEmission = await getMarketsDistribution(storageService, age.startTimestamp.toNumber());
      expect(marketEmission).not.toBeUndefined();
    });
  }

  describe.each(age.epochs)(`Test each epochs of ${age.ageName}`, (epochConfig) => {
    const { initialTimestamp, finalTimestamp, initialBlock, finalBlock, snapshotBlock, epochNumber } = epochConfig;

    if (initialTimestamp.lt(ts)) {
      it(`Should have a snapshot block for epoch ${epochNumber}`, () => {
        expect(snapshotBlock).not.toBeUndefined();
      });
      it(`Should have an initial block for epoch ${epochNumber}`, () => {
        expect(initialBlock).not.toBeUndefined();
      });

      it(`Should have a distribution computed for epoch ${epochNumber}`, async () => {
        let file: object | undefined = undefined;
        try {
          file = (await storageService.readMarketDistribution(epochNumber))!;
        } catch (e) {
          console.error(e);
        }
        expect(file).not.toBeUndefined();
      });

      describe(`Distribution for epoch ${epochNumber}`, () => {
        let marketsEmissions: { [p: string]: Optional<MarketEmission> } = {};
        let file: MarketsEmissionFs;
        beforeAll(async () => {
          file = (await storageService.readMarketDistribution(epochNumber))!;
          ({ marketsEmissions } = await age.distribution(age, epochConfig, provider));
        });
        it(`Should have a correct number of markets computed for epoch ${epochNumber}`, async () => {
          expect(Object.values(marketsEmissions).length).toEqual(Object.values(file.markets).length);
        });
        it(`Should have the correct markets computed for epoch ${epochNumber}`, async () => {
          expect(Object.keys(marketsEmissions)).toEqual(Object.keys(file.markets));
        });
        it(`Should have the correct supply rates computed for epoch ${epochNumber}`, async () => {
          Object.entries(marketsEmissions).forEach(([market, emission]) =>
            expect(emission!.morphoRatePerSecondSupplySide.toString()).toEqual(
              file.markets[market].morphoRatePerSecondSupplySide
            )
          );
        });
        it(`Should have the correct borrow rates computed for epoch ${epochNumber}`, async () => {
          Object.entries(marketsEmissions).forEach(([market, emission]) =>
            expect(emission!.morphoRatePerSecondBorrowSide.toString()).toEqual(
              file.markets[market].morphoRatePerSecondBorrowSide
            )
          );
        });
        if (epochNumber >= 4) {
          it(`Should not distribute tokens on Compound FEI deprecated market for epoch ${epochNumber}`, async () => {
            expect(marketsEmissions[cFei]).toBeUndefined(); // no distribution for the fei token
          });

          it(`Should not distribute tokens to StEth borrowers on Aave for epoch ${epochNumber}`, async () => {
            expect(marketsEmissions[aStEth]?.morphoRatePerSecondBorrowSide.isZero()).toEqual(true); // no borrowers of steth on aave
            expect(marketsEmissions[aStEth]?.morphoEmittedBorrowSide.isZero()).toEqual(true); // no borrowers of steth on aave
          });
        }
      });
    }
    if (finalTimestamp.lt(ts)) {
      it(`Should have a final block for epoch ${epochNumber}`, () => {
        expect(finalBlock).not.toBeUndefined();
      });
    }
  });
});
