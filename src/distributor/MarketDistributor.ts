import { providers } from "ethers";
import ageEpochs from "./configuration/age-epochs.json";
import { parseUnits } from "ethers/lib/utils";
import { DistributionFn } from "./distributionScripts/common";
import { EtherscanBlockFetcher } from "./blockFetcher/EtherscanBlockFetcher";

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
  distributionScript: string;
  distributionParameters: DistributionParameters;
}
interface DistributionParameters extends Record<string, any> {
  totalEmission: string;
}

export interface IConfigurationFetcher {
  getConfigurations: (ids: string[]) => AgeEpoch[];
  getAllConfigurations: () => AgeEpoch[];
}
export class InMemoryConfigurationFetcher implements IConfigurationFetcher {
  getConfigurations(ids: string[]) {
    return ageEpochs.filter(({ id }) => ids.includes(id));
  }
  getAllConfigurations() {
    return ageEpochs;
  }
}

export class MarketDistributor {
  #provider: providers.Provider;
  #storage: IMarketStorage;
  #blockFetcher: IBlockFetcher;
  #configFetcher: IConfigurationFetcher;

  constructor(
    _provider: providers.Provider,
    _storage: IMarketStorage,
    _blockFetcher: IBlockFetcher = new EtherscanBlockFetcher(process.env.ETHERSCAN_API_KEY!),
    _configFetcher: IConfigurationFetcher = new InMemoryConfigurationFetcher()
  ) {
    this.#provider = _provider;
    this.#storage = _storage;
    this.#blockFetcher = _blockFetcher;
    this.#configFetcher = _configFetcher;
  }

  public async distribute(ids: string[] = []) {
    const configurations =
      ids.length > 0 ? this.#configFetcher.getConfigurations(ids) : this.#configFetcher.getAllConfigurations();
    for (const ageEpoch of configurations) {
      if (!isCorrectConfig(ageEpoch)) throw new Error(`Invalid age epoch config: ${ageEpoch}`);
      console.log("Distributing", ageEpoch.id);
      const distributionFn = (await import(`./distributionScripts/${ageEpoch.distributionScript}.ts`).then(
        (m) => m.default
      )) as DistributionFn;
      if (!distributionFn) {
        throw new Error(`No distribution script found for age epoch ${ageEpoch.id}`);
      }
      const formatTs = (utcTs: string) => Math.floor(new Date(utcTs).getTime() / 1000);

      const snapshotBlock =
        ageEpoch.snapshotBlock || (await this.#getSnapshotBlock(formatTs(ageEpoch.initialTimestamp)));
      if (!snapshotBlock) {
        console.log(`No snapshot found for ${ageEpoch.id}, market emission skipped`);
        continue;
      }

      const params = {
        id: ageEpoch.id,
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
    if (snapshotTs > now()) return;
    return this.#blockFetcher.blockFromTimestamp(snapshotTs, "after");
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

const now = () => Date.now() / 1000;
