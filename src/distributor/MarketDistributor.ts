import { providers } from "ethers";
import ageEpochs from "./configuration/age-epochs.json";
import { parseUnits } from "ethers/lib/utils";
import { DistributionFn } from "./distributionScripts/common";

export interface IMarketStorage {
  storeMarketsEmissions: (ageEpoch: AgeEpoch, params: Awaited<ReturnType<DistributionFn>>) => Promise<void>;
}
export interface IBlockFetcher {
  blockFromTimestamp: (timestamp: number, direction: "before" | "after") => Promise<number>;
}

export interface AgeEpoch {
  id: string;
  initialTimestamp: string;
  finalTimestamp: string;
  snapshotBlock?: number;
  distributionParameters: DistributionParameters;
}
interface DistributionParameters extends Record<string, any> {
  totalEmission: string;
}
export class MarketDistributor {
  #provider: providers.Provider;
  #storage: IMarketStorage;
  #blockFetcher: IBlockFetcher;

  constructor(_provider: providers.Provider, _storage: IMarketStorage, _blockFetcher: IBlockFetcher) {
    this.#provider = _provider;
    this.#storage = _storage;
    this.#blockFetcher = _blockFetcher;
  }

  public async distribute(ids: string[] = []) {
    const configurations = ids.length > 0 ? ageEpochs.filter(({ id }) => ids.includes(id)) : ageEpochs;
    for (const ageEpoch of configurations) {
      if (!isCorrectConfig(ageEpoch)) throw new Error(`Invalid age epoch config: ${ageEpoch}`);
      console.log("Distributing age epoch", ageEpoch.id);
      const distributionFn = (await import(`./distributionScripts/${ageEpoch.distributionScript}.ts`).then(
        (m) => m.default
      )) as DistributionFn;
      if (!distributionFn) {
        throw new Error(`No distribution script found for age epoch ${ageEpoch.id}`);
      }
      const formatTs = (utcTs: string) => Math.floor(new Date(utcTs).getTime() / 1000);

      const snapshotBlock =
        ageEpoch.snapshotBlock || (await this.#getSnapshotBlock(formatTs(ageEpoch.initialTimestamp)));

      const params = {
        provider: this.#provider,
        initialTimestamp: formatTs(ageEpoch.initialTimestamp),
        finalTimestamp: formatTs(ageEpoch.finalTimestamp),
        snapshotBlock,
        ...ageEpoch.distributionParameters,
        totalEmission: parseUnits(ageEpoch.distributionParameters.totalEmission),
      };
      const result = await distributionFn(params);
      await this.#storage.storeMarketsEmissions(ageEpoch, result);
    }
  }
  #getSnapshotBlock(ts: number) {
    const snapshotTs = ts - 3600;
    return this.#blockFetcher.blockFromTimestamp(snapshotTs, "before");
  }
}

export const isCorrectConfig = (config: any): config is AgeEpoch =>
  !!(
    config &&
    typeof config === "object" &&
    config.id &&
    config.initialTimestamp &&
    config.finalTimestamp &&
    config.distributionParameters &&
    config.distributionScript &&
    typeof config.distributionParameters === "object" &&
    config.distributionParameters.totalEmission
  );
