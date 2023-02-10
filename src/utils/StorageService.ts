import * as path from "path";
import * as fs from "fs";
import { MarketsEmission } from "../ages/distributions/MarketsEmission";
import { Proof, Proofs } from "../ages/distributions/Proofs";
import { numberOfEpochs } from "../ages/ages";
import { UsersDistribution } from "../ages/distributions/UsersDistribution";

export interface StorageService {
  readMarketDistribution: (age: string, epoch: string) => Promise<MarketsEmission | void>;
  writeMarketEmission: (age: string, epoch: string, emission: MarketsEmission) => Promise<void>;
  readUsersDistribution: (age: string, epoch: string) => Promise<UsersDistribution | void>;
  writeUsersDistribution: (age: string, epoch: string, distribution: UsersDistribution) => Promise<void>;
  readProofs: (epoch: number) => Promise<Proofs | void>;
  readAllProofs: () => Promise<Proofs[]>;
  readUserProof: (epoch: number, address: string) => Promise<Proof | void>;
  writeProofs: (epoch: number, proofs: Proofs) => Promise<void>;
}

export type ProofsCache = { [epoch: number]: Proofs | undefined };
export type MarketsEmissionCache = {
  [age: string]: {
    [epoch: string]: MarketsEmission | undefined;
  };
};
export type UsersDistributionCache = {
  [age: string]: {
    [epoch: string]: UsersDistribution | undefined;
  };
};

export class FileSystemStorageService implements StorageService {
  #emissionsCache: MarketsEmissionCache = {};
  #distributionsCache: UsersDistributionCache = {};
  #proofsCache: ProofsCache = {};
  #distributionRoot = "../../distribution";

  #generateDistributionPath(age: string, epoch: string) {
    const folder = path.resolve(__dirname, this.#distributionRoot, age, epoch);
    const file = path.resolve(folder, "marketsEmission.json");
    return { folder, file };
  }

  #generateProofsPath(epoch: number) {
    const folder = path.resolve(__dirname, this.#distributionRoot, "proofs");
    const filename = `proofs-${epoch}.json`;
    const file = path.resolve(folder, filename);
    return { folder, file };
  }

  #generateUsersDistributionPath(age: string, epoch: string) {
    const folder = path.resolve(__dirname, this.#distributionRoot, age, epoch);
    const file = path.resolve(folder, "usersDistribution.json");
    return { folder, file };
  }

  async readMarketDistribution(age: string, epoch: string) {
    try {
      const inCache = this.#emissionsCache[age]?.[epoch];
      if (inCache) return inCache;
      const { file } = this.#generateDistributionPath(age, epoch);
      const distribution = require(file) as MarketsEmission;
      this.#emissionsCache[age] = { ...this.#emissionsCache[age], [epoch]: distribution };
      return distribution;
    } catch (error) {
      return;
    }
  }

  async writeMarketEmission(age: string, epoch: string, emission: MarketsEmission) {
    const { folder, file } = this.#generateDistributionPath(age, epoch);
    const fileExists = await fs.promises
      .access(file, fs.constants.R_OK | fs.constants.W_OK)
      .then(() => true)
      .catch(() => false);
    if (fileExists) throw new Error(`File ${file} already exists, can't write it.`);
    await fs.promises.mkdir(folder, { recursive: true });
    await fs.promises.writeFile(file, JSON.stringify(emission, null, 2));
  }

  async readUsersDistribution(age: string, epoch: string) {
    try {
      const inCache = this.#distributionsCache[age]?.[epoch];
      if (inCache) return inCache;
      const { file } = this.#generateUsersDistributionPath(age, epoch);
      const distribution = require(file) as UsersDistribution;
      this.#distributionsCache[age] = { ...this.#distributionsCache[age], [epoch]: distribution };
      return distribution;
    } catch (error) {
      return;
    }
  }

  async writeUsersDistribution(age: string, epoch: string, distribution: UsersDistribution) {
    const { folder, file } = this.#generateUsersDistributionPath(age, epoch);
    const fileExists = await fs.promises
      .access(file, fs.constants.R_OK | fs.constants.W_OK)
      .then(() => true)
      .catch(() => false);
    if (fileExists) throw new Error(`File ${file} already exists, can't write it.`);
    await fs.promises.mkdir(folder, { recursive: true });
    await fs.promises.writeFile(file, JSON.stringify(distribution, null, 2));
  }

  async readProofs(epoch: number) {
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
    const result = await Promise.all(
      new Array(numberOfEpochs).fill(0).map(async (_, index) => {
        const epoch = numberOfEpochs - index;
        const proofs = await this.readProofs(epoch);
        return proofs ? [proofs] : [];
      })
    );
    return result.flat();
  }

  async readUserProof(epoch: number, address: string) {
    const proof = await this.readProofs(epoch);
    return proof?.proofs?.[address];
  }

  async writeProofs(epoch: number, proofs: Proofs) {
    const { folder, file } = this.#generateProofsPath(epoch);
    const fileExists = await fs.promises
      .access(file, fs.constants.R_OK | fs.constants.W_OK)
      .then(() => true)
      .catch(() => false);
    if (fileExists) throw new Error(`File ${file} already exists, can't write it.`);
    await fs.promises.mkdir(folder, { recursive: true });
    await fs.promises.writeFile(file, JSON.stringify(proofs, null, 2));
  }
}
