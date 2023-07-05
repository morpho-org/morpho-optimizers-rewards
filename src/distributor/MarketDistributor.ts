import { BigNumber, constants, providers } from "ethers";
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
  getEndedConfigurations: (ts: number) => AgeEpoch[];
  getAccumulatedRewardsEmitted: (id: string) => BigNumber;
}
export class InMemoryConfigurationFetcher implements IConfigurationFetcher {
  getConfigurations(ids: string[]) {
    return ageEpochs.filter(({ id }) => ids.includes(id));
  }
  getAllConfigurations() {
    return ageEpochs;
  }
  static getEndedConfigurations(ts: number) {
    return ageEpochs.filter(({ finalTimestamp }) => ts > parseDate(finalTimestamp));
  }
  getEndedConfigurations(ts: number) {
    return InMemoryConfigurationFetcher.getEndedConfigurations(ts);
  }

  getAccumulatedRewardsEmitted(id: string) {
    const lastEpoch = ageEpochs.find(({ id: _id }) => _id === id);
    if (!lastEpoch) throw new Error(`No epoch found for id ${id}`);
    const allEmitted = ageEpochs.filter(
      ({ initialTimestamp }) => parseDate(initialTimestamp) < parseDate(lastEpoch.finalTimestamp)
    );

    return allEmitted.reduce((acc, { distributionParameters: { totalEmission } }) => {
      return acc.add(parseUnits(totalEmission));
    }, constants.Zero);
  }
}

export class MarketDistributor {
  #provider: providers.Provider;
  #blockFetcher: IBlockFetcher;
  #configFetcher: IConfigurationFetcher;

  constructor(
    _provider: providers.Provider,
    _blockFetcher: IBlockFetcher = new EtherscanBlockFetcher(process.env.ETHERSCAN_API_KEY!),
    _configFetcher: IConfigurationFetcher = new InMemoryConfigurationFetcher()
  ) {
    this.#provider = _provider;
    this.#blockFetcher = _blockFetcher;
    this.#configFetcher = _configFetcher;
  }

  public async distribute(ids: string[] = []) {
    const configurations =
      ids.length > 0 ? this.#configFetcher.getConfigurations(ids) : this.#configFetcher.getAllConfigurations();
    const results: Record<string, Awaited<ReturnType<DistributionFn>>> = {};
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
      results[ageEpoch.id] = await distributionFn(params);
    }
    return results;
  }

  async fetchConfigTimestampsBlocks() {
    const configs = this.#configFetcher.getAllConfigurations();
    const configBlocks: Record<
      any,
      {
        initialBlock: number;
        finalBlock?: number;
      }
    > = {};
    const currentTs = now();
    for (const config of configs) {
      const { initialTimestamp, finalTimestamp } = config;
      const [initialBlock, finalBlock] = await Promise.all([
        parseDate(initialTimestamp) < currentTs
          ? this.#blockFetcher.blockFromTimestamp(parseDate(initialTimestamp), "before")
          : undefined,
        parseDate(finalTimestamp) < currentTs
          ? this.#blockFetcher.blockFromTimestamp(parseDate(finalTimestamp), "after")
          : undefined,
      ]);
      if (!initialBlock) continue;

      configBlocks[config.id] = {
        initialBlock,
        finalBlock,
      };
    }
    return configBlocks;
  }
  #getSnapshotBlock(ts: number) {
    const snapshotTs = ts - 3600;
    if (snapshotTs > now()) return;
    return this.#blockFetcher.blockFromTimestamp(snapshotTs, "after");
  }

  get configFetcher() {
    return this.#configFetcher;
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

export const now = () => Date.now() / 1000;

export const parseDate = (date: string) => Math.floor(new Date(date).getTime() / 1000);
