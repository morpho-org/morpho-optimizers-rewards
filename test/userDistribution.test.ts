import { ages } from "../src";
import {
  computeMerkleTree,
  fetchUsers,
  getAccumulatedEmission,
  timestampToEpoch,
  UserBalances,
  userBalancesToUnclaimedTokens,
} from "../src/utils";
import { SUBGRAPH_URL } from "../src/config";
import { BigNumber, constants, providers } from "ethers";
import { RootUpdatedEvent } from "@morpho-labs/morpho-ethers-contract/lib/RewardsDistributor";
import { RewardsDistributor__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { MarketRewards, sumRewards, getPrevEpoch, getAccumulatedEmissionPerMarket } from "../src/utils";
import { VERSION_2_TIMESTAMP } from "../src/constants/mechanismUpgrade";
import { FileSystemStorageService } from "../src/utils/StorageService";

const storageService = new FileSystemStorageService();

describe.each([...ages])("Age Users Distribution", (age) => {
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);

  const now = Math.floor(Date.now() / 1000);

  describe.each(age.epochs)("Epochs distribution for age", ({ finalTimestamp, finalBlock, epochNumber }) => {
    if (finalTimestamp.gt(now)) return;
    let usersBalances: UserBalances[];
    let usersAccumulatedRewards: { address: string; accumulatedRewards: string; rewards: MarketRewards[] }[];

    beforeAll(async () => {
      usersBalances = await fetchUsers(SUBGRAPH_URL, finalBlock ?? undefined);
      usersAccumulatedRewards = await Promise.all(
        usersBalances.map(async ({ address, balances }) => {
          const rewards = await userBalancesToUnclaimedTokens(balances, finalTimestamp, provider, storageService);
          return {
            address,
            rewards,
            accumulatedRewards: sumRewards(rewards).toString(), // with 18 * 2 decimals
          };
        })
      );
    });

    it(`Should distribute the correct number of tokens over Morpho users for epoch ${epochNumber}`, async () => {
      const totalEmitted = usersAccumulatedRewards.reduce((a, b) => a.add(b.accumulatedRewards), BigNumber.from(0));
      const accumulatedEmission = getAccumulatedEmission(epochNumber); // we sum the emissions
      expect(totalEmitted).toBnApproxEq(accumulatedEmission, linearPrecision(epochNumber));
    });

    it(`Should distribute the correct number of tokens per market for epoch ${epochNumber}`, async () => {
      const markets = [...new Set(usersBalances.map((ub) => ub.balances.map((b) => b.market.address)).flat())];
      await Promise.all(
        markets.map(async (marketAddress) => {
          const emissions = await getAccumulatedEmissionPerMarket(marketAddress, epochNumber, storageService);
          const rewardsPerMarket = usersAccumulatedRewards.reduce(
            (acc, b) => {
              const marketRewards = b.rewards.find((r) => r.market.address === marketAddress);
              if (!marketRewards) return acc;
              return {
                supply: acc.supply.add(marketRewards.accumulatedSupply),
                borrow: acc.borrow.add(marketRewards.accumulatedBorrow),
              };
            },
            { supply: constants.Zero, borrow: constants.Zero }
          );
          expect(emissions.supply).toBnApproxEq(rewardsPerMarket.supply, linearPrecision(epochNumber));
          expect(emissions.borrow).toBnApproxEq(rewardsPerMarket.borrow, linearPrecision(epochNumber));
        })
      );
    });
  });
});

describe("On chain roots update", () => {
  let rootUpdates: RootUpdatedEvent[] = [];
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);

  beforeAll(async () => {
    const rewardsDistributor = RewardsDistributor__factory.connect(addresses.morphoDao.rewardsDistributor, provider);
    rootUpdates = await rewardsDistributor.queryFilter(rewardsDistributor.filters.RootUpdated());
  });

  it("Should have multiple root updates", () => expect(rootUpdates.length).toBeGreaterThan(0));

  it("Should have correct roots", async () => {
    await Promise.all(
      rootUpdates.map(async (rootEvent) => {
        const block = await rootEvent.getBlock();
        const epochConfig = getPrevEpoch(timestampToEpoch(block.timestamp)!.epoch.epochNumber);
        expect(epochConfig).not.toBeUndefined();

        if (epochConfig!.epoch.epochNumber === 2) return; // not check for root 2
        const usersBalances = await fetchUsers(SUBGRAPH_URL, epochConfig!.epoch.finalBlock ?? undefined);
        const usersAccumulatedRewards = await Promise.all(
          usersBalances.map(async ({ address, balances }) => ({
            address,
            accumulatedRewards: sumRewards(
              await userBalancesToUnclaimedTokens(balances, epochConfig!.epoch.finalTimestamp, provider, storageService)
            ).toString(), // with 18 * 2 decimals
          }))
        );
        const merkleRoot = computeMerkleTree(usersAccumulatedRewards.filter((r) => r.accumulatedRewards !== "0"));
        expect(merkleRoot.root.toLowerCase()).toEqual(rootEvent.args.newRoot);
      })
    );
  });
});
describe.skip("Version 2 rewards distribution mechanism", () => {
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
  const version2Block = ages[2].epochs[0].finalBlock;
  let usersBalancesMerge: UserBalances[];
  beforeAll(async () => {
    usersBalancesMerge = await fetchUsers(SUBGRAPH_URL, version2Block ?? undefined);
  });
  it("Should have a block corresponding to the update", () => expect(version2Block).not.toBeUndefined());
  it("Should be equal to version one rewards at the moment of the switch on the subgraph", () => {
    usersBalancesMerge.forEach(async (user) =>
      user.balances.forEach((r) => {
        expect(r.accumulatedSupplyMorpho).toBnEq(r.accumulatedSupplyMorphoV1);
        expect(r.accumulatedBorrowMorpho).toBnEq(r.accumulatedBorrowMorphoV1);
      })
    );
  });
  it("Should be equal to version one rewards at the moment of the switch", async () => {
    await Promise.all(
      usersBalancesMerge.map(async (user) => {
        const rewards = await userBalancesToUnclaimedTokens(
          user.balances,
          VERSION_2_TIMESTAMP,
          provider,
          storageService
        );
        rewards.forEach((r) => {
          expect(r.accumulatedSupply).toBnEq(r.accumulatedSupplyV1);
          expect(r.accumulatedBorrow).toBnEq(r.accumulatedBorrowV1);
        });
      })
    );
  });
  it("Cannot be less than v1 rewards after the version 2 upgrade", async () => {
    const upgradeRewards = await Promise.all(
      usersBalancesMerge.map(async (user) => ({
        userAddress: user.address,
        rewards: await userBalancesToUnclaimedTokens(user.balances, VERSION_2_TIMESTAMP, provider, storageService),
      }))
    );
    await Promise.all(
      usersBalancesMerge.map(async (user) => {
        const userUpgradeRewards = upgradeRewards.find((u) => u.userAddress === user.address);
        expect(userUpgradeRewards).not.toBeUndefined();

        const rewards = await userBalancesToUnclaimedTokens(
          user.balances,
          VERSION_2_TIMESTAMP.add(3600 * 24 * 7),
          provider,
          storageService
        );
        rewards.forEach((r) => {
          const upgradeReward = userUpgradeRewards!.rewards.find((_r) => _r.market.address === r.market.address);
          expect(upgradeReward).not.toBeUndefined();
          expect(r.accumulatedSupply).toBnGte(upgradeReward!.accumulatedSupply);
          expect(r.accumulatedBorrow).toBnGte(upgradeReward!.accumulatedBorrow);
        });
      })
    );
  });
});

const linearPrecision = (epochNumber: number) => (Math.ceil(epochNumber / 2) * 1e18).toString();
