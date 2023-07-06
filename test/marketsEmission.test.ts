import { getEpochMarketsDistribution } from "../src/utils/getEpochMarketsDistribution";
import { getDefaultProvider, providers } from "ethers";
import { MarketEmission } from "../src/ages/distributionScripts/common";
import { aStEth, cFei, parseDate, wEth } from "../src/helpers";
import { FileSystemStorageService } from "../src/utils/StorageService";
import { MarketsEmissionFs } from "../src/ages/distributions/MarketsEmissionFs";
import { formatUnits } from "ethers/lib/utils";
import {
  getAaveMarketsParameters,
  getAaveV3MarketsParameters,
  getCompoundMarketsParameters,
} from "../src/utils/markets/fetchMarketsData";
import { getEpoch, ParsedAgeEpochConfig, rawEpochs } from "../src";

const storageService = new FileSystemStorageService();

describe("Test Market data fetching", () => {
  const provider = getDefaultProvider(process.env.RPC_URL);
  const blockTag = 17_000_000;
  describe("Compound", () => {
    it("Should fetch Compound data", async () => {
      const marketParamers = await getCompoundMarketsParameters(blockTag, provider);
      expect(marketParamers).toMatchSnapshot();
    });
  });
  describe("Aave", () => {
    it("Should fetch Aave v2 data", async () => {
      const marketParamers = await getAaveMarketsParameters(blockTag, provider);
      expect(marketParamers).toMatchSnapshot();
    });
    it("Should fetch Aave v3 data", async () => {
      const MA3_DEPLOYMENT_BLOCK = 17161283;
      const marketParamers = await getAaveV3MarketsParameters(MA3_DEPLOYMENT_BLOCK + 1, provider);
      expect(marketParamers).toMatchSnapshot();
    });
  });
});

describe.each(rawEpochs)("Test Epochs Configuration", (rawEpoch) => {
  let epoch: ParsedAgeEpochConfig;

  beforeAll(async () => {
    epoch = await getEpoch(rawEpoch.id);
  });
  const ts = Math.floor(Date.now() / 1000);
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);

  it(`Should have the correct configuration for ${rawEpoch.id}`, () => {
    expect(epoch.initialTimestamp).not.toBeUndefined();
    expect(epoch.finalTimestamp).not.toBeUndefined();
    expect(epoch.distributionParameters.totalEmission).not.toBeUndefined();
  });
  it(`Should have consistent timestamps for ${rawEpoch.id}`, () => {
    expect(epoch.initialTimestamp).toBeLessThan(epoch.finalTimestamp);
    if (epoch.id !== "age1-epoch1") {
      const rawPreviousEpoch = rawEpochs[rawEpochs.indexOf(rawEpoch) - 1];
      expect(rawPreviousEpoch).not.toBeUndefined();
      expect(parseDate(rawPreviousEpoch.finalTimestamp)).toBeLessThanOrEqual(epoch.initialTimestamp);
    }
  });

  if (parseDate(rawEpoch.initialTimestamp) < ts) {
    it(`should have a snapshot block for ${rawEpoch.id}`, () => {
      expect(epoch.snapshotBlock).not.toBeUndefined();
    });
    it(`should have an initial block for ${rawEpoch.id}`, () => {
      expect(epoch.initialBlock).not.toBeUndefined();
    });
    it(`Should return a market configuration for ${rawEpoch.id}`, async () => {
      const marketEmission = await getEpochMarketsDistribution(epoch.id, provider, storageService);
      expect(marketEmission).not.toBeUndefined();
    });
  }

  describe(`Distribution for epoch ${rawEpoch.id}`, () => {
    let marketsEmissions: Record<string, MarketEmission> = {};
    let file: MarketsEmissionFs;
    beforeAll(async () => {
      const _file = await storageService.readMarketDistribution(epoch.id);
      expect(file).not.toBeUndefined();
      file = _file!;
      ({ marketsEmissions } = await epoch.distributionScript({
        ...epoch,
        ...epoch.distributionParameters,
        provider,
        snapshotBlock: epoch.snapshotBlock!,
      }));
    });
    it(`Should have a correct number of markets computed for epoch ${rawEpoch.id}`, async () => {
      expect(Object.values(marketsEmissions).length).toEqual(Object.values(file.markets).length);
    });
    it(`Should have the correct markets computed for epoch ${rawEpoch.id}`, async () => {
      expect(Object.keys(marketsEmissions)).toEqual(Object.keys(file.markets));
    });
    it(`Should have the correct supply rates computed for epoch ${rawEpoch.id}`, async () => {
      Object.entries(marketsEmissions).forEach(([market, emission]) =>
        expect(formatUnits(emission!.morphoRatePerSecondSupplySide)).toEqual(
          file.markets[market].morphoRatePerSecondSupplySide
        )
      );
    });
    it(`Should have the correct borrow rates computed for epoch ${rawEpoch.id}`, async () => {
      Object.entries(marketsEmissions).forEach(([market, emission]) =>
        expect(formatUnits(emission!.morphoRatePerSecondBorrowSide)).toEqual(
          file.markets[market].morphoRatePerSecondBorrowSide
        )
      );
    });
    const epochNumber = rawEpochs.indexOf(rawEpoch) + 1;
    if (epochNumber >= 4) {
      it(`Should not distribute tokens on Compound FEI deprecated market for epoch ${rawEpoch.id}`, async () => {
        expect(marketsEmissions[cFei]).toBeUndefined(); // no distribution for the fei token
      });
      if (marketsEmissions[aStEth]) {
        it(`Should not distribute tokens to StEth borrowers on Aave for epoch ${rawEpoch.id}`, async () => {
          expect(marketsEmissions[aStEth]!.morphoRatePerSecondBorrowSide.isZero()).toEqual(true); // no borrowers of steth on aave
          expect(marketsEmissions[aStEth]!.morphoEmittedBorrowSide.isZero()).toEqual(true); // no borrowers of steth on aave
        });
      }
      if (marketsEmissions[wEth]) {
        it(`Should not distribute tokens to WETH borrowers on Aave V3 for epoch ${rawEpoch.id}`, async () => {
          expect(marketsEmissions[wEth]!.morphoRatePerSecondBorrowSide.isZero()).toEqual(true); // no borrowers of steth on aave
          expect(marketsEmissions[wEth]!.morphoEmittedBorrowSide.isZero()).toEqual(true); // no borrowers of steth on aave
        });
      }
    }
  });
});
