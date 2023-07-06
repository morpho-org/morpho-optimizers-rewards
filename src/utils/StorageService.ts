import * as path from "path";
import * as fs from "fs";
import { MarketsEmissionFs } from "../ages/distributions/MarketsEmissionFs";
import { Proof, Proofs } from "../ages/distributions/Proofs";
import { finishedEpochs } from "../ages";
import { UsersDistribution } from "../ages/distributions/UsersDistribution";
import { isDefined } from "../helpers";

export interface StorageService {
  readMarketDistribution: (epochId: string) => Promise<MarketsEmissionFs | void>;
  writeMarketEmission: (epochId: string, emission: MarketsEmissionFs, force?: boolean) => Promise<void>;
  readUsersDistribution: (epochId: string) => Promise<UsersDistribution | void>;
  writeUsersDistribution: (epochId: string, distribution: UsersDistribution, force?: boolean) => Promise<void>;
  readProofs: (epochId: string) => Promise<Proofs | void>;
  readAllProofs: () => Promise<Proofs[]>;
  readUserProof: (epochId: string, address: string) => Promise<Proof | void>;
  writeProofs: (epochId: string, proofs: Proofs, force?: boolean) => Promise<void>;
}

export type ProofsCache = { [epochId: string]: Proofs | undefined };
export type MarketsEmissionCache = { [epochId: string]: MarketsEmissionFs | undefined };
export type UsersDistributionCache = { [epochId: string]: UsersDistribution | undefined };

export class FileSystemStorageService implements StorageService {
  #emissionsCache: MarketsEmissionCache = {};
  #distributionsCache: UsersDistributionCache = {};
  #proofsCache: ProofsCache = {};
  #distributionRoot = "../../distribution";

  async readMarketDistribution(epochId: string) {
    try {
      const inCache = this.#emissionsCache[epochId];
      if (inCache) return inCache;
      const { file } = this.#generateDistributionPath(epochId);
      const distribution = require(file) as MarketsEmissionFs;
      this.#emissionsCache[epochId] = distribution;
      return distribution;
    } catch (error) {
      return;
    }
  }

  async writeMarketEmission(epochId: string, emission: MarketsEmissionFs, force?: boolean) {
    const { folder, file } = this.#generateDistributionPath(epochId);
    const fileExists = await fs.promises
      .access(file, fs.constants.R_OK | fs.constants.W_OK)
      .then(() => true)
      .catch(() => false);
    if (fileExists && !force) throw new Error(`File ${file} already exists, can't write it.`);
    await fs.promises.mkdir(folder, { recursive: true });
    await fs.promises.writeFile(file, JSON.stringify(emission, null, 2));
  }

  async readUsersDistribution(epochId: string) {
    try {
      const inCache = this.#distributionsCache[epochId];
      if (inCache) return inCache;
      const { file } = this.#generateUsersDistributionPath(epochId);
      const distribution = require(file) as UsersDistribution;
      this.#distributionsCache[epochId] = distribution;
      return distribution;
    } catch (error) {
      return;
    }
  }

  async writeUsersDistribution(epochId: string, distribution: UsersDistribution, force?: boolean) {
    const { folder, file } = this.#generateUsersDistributionPath(epochId);
    const fileExists = await fs.promises
      .access(file, fs.constants.R_OK | fs.constants.W_OK)
      .then(() => true)
      .catch(() => false);
    if (fileExists && !force) throw new Error(`File ${file} already exists, can't write it.`);
    await fs.promises.mkdir(folder, { recursive: true });
    await fs.promises.writeFile(file, JSON.stringify(distribution, null, 2));
  }

  async readProofs(epoch: string) {
    try {
      const inCache = this.#proofsCache[epoch];
      if (inCache) return inCache;
      const { file } = this.#generateProofsPath(epoch);
      const proofs = require(file) as Proofs;
      this.#proofsCache[epoch] = proofs;
      return proofs;
    } catch (error) {
      return;
    }
  }

  async readAllProofs() {
    const allEpochsWithProofs = await finishedEpochs();
    const result = await Promise.all(
      allEpochsWithProofs.map(async (epoch) => {
        return this.readProofs(epoch.id);
      })
    );
    return result.filter(isDefined);
  }

  async readUserProof(epoch: string, address: string) {
    const proof = await this.readProofs(epoch);
    return proof?.proofs?.[address];
  }

  async writeProofs(epoch: string, proofs: Proofs, force?: boolean) {
    const { folder, file } = this.#generateProofsPath(epoch);
    const fileExists = await fs.promises
      .access(file, fs.constants.R_OK | fs.constants.W_OK)
      .then(() => true)
      .catch(() => false);
    if (fileExists && !force) throw new Error(`File ${file} already exists, can't write it.`);
    await fs.promises.mkdir(folder, { recursive: true });
    await fs.promises.writeFile(file, JSON.stringify(proofs, null, 2));
  }

  #generateDistributionPath(epochId: string) {
    const folder = path.resolve(__dirname, this.#distributionRoot, ...this.#getAgeEpochPaths(epochId));
    const file = path.resolve(folder, "marketsEmission.json");
    return { folder, file };
  }

  #generateProofsPath(epochId: string) {
    const folder = path.resolve(__dirname, this.#distributionRoot, ...this.#getAgeEpochPaths(epochId));
    const file = path.resolve(folder, "proofs.json");
    return { folder, file };
  }

  #generateUsersDistributionPath(epochId: string) {
    const folder = path.resolve(__dirname, this.#distributionRoot, ...this.#getAgeEpochPaths(epochId));
    const file = path.resolve(folder, "usersDistribution.json");
    return { folder, file };
  }

  #getAgeEpochPaths(epochId: string) {
    return epochId.split("-");
  }
}
