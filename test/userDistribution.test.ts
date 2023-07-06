import {
  computeMerkleTree,
  fetchUsers,
  getAccumulatedEmission,
  UserBalances,
  userBalancesToUnclaimedTokens,
} from "../src/utils";
import { SUBGRAPH_URL } from "../src/config";
import { BigNumber, constants, providers } from "ethers";
import { RootUpdatedEvent } from "@morpho-labs/morpho-ethers-contract/lib/RewardsDistributor";
import { RewardsDistributor__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { MarketRewards, sumRewards, getAccumulatedEmissionPerMarket } from "../src/utils";
import { FileSystemStorageService } from "../src/utils/StorageService";
import { epochsBefore, finishedEpochs, getEpoch, ParsedAgeEpochConfig, timestampToEpoch } from "../src";
import rawEpochs from "../src/age-epochs.json";
import { parseDate, now } from "../src/helpers";

const storageService = new FileSystemStorageService();

describe("User distribution", () => {
  beforeAll(async () => {
    // fill the block cache
    // TODO: find a better way to do this
    await finishedEpochs();
  });
  describe.each(rawEpochs.filter((e) => parseDate(e.finalTimestamp) < now()))(
    "Epoch Users Distribution e2e",
    ({ id: epochId }) => {
      let epoch: ParsedAgeEpochConfig;

      const provider = new providers.JsonRpcProvider(process.env.RPC_URL);

      let usersBalances: UserBalances[];
      let usersAccumulatedRewards: { address: string; accumulatedRewards: string; rewards: MarketRewards[] }[];
      beforeAll(async () => {
        epoch = await getEpoch(epochId);
        usersBalances = await fetchUsers(SUBGRAPH_URL, epoch.finalBlock);
        usersAccumulatedRewards = await Promise.all(
          usersBalances.map(async ({ address, balances }) => {
            const rewards = await userBalancesToUnclaimedTokens(
              balances,
              epoch.finalTimestamp,
              provider,
              storageService
            );
            return {
              address,
              rewards,
              accumulatedRewards: sumRewards(rewards).toString(), // with 18 * 2 decimals
            };
          })
        );
      });

      it(`Should distribute the correct number of tokens over Morpho users for ${epochId}`, async () => {
        const totalEmitted = usersAccumulatedRewards.reduce((a, b) => a.add(b.accumulatedRewards), BigNumber.from(0));
        const accumulatedEmission = getAccumulatedEmission(epochId); // we sum the emissions
        expect(totalEmitted).toBnApproxEq(accumulatedEmission, linearPrecision(epochId));
      });

      it(`Should distribute the correct number of tokens per market for epoch ${epochId}`, async () => {
        const markets = [...new Set(usersBalances.map((ub) => ub.balances.map((b) => b.market.address)).flat())];
        await Promise.all(
          markets.map(async (marketAddress) => {
            const emissions = await getAccumulatedEmissionPerMarket(marketAddress, epochId, storageService);
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
            expect(emissions.supply).toBnApproxEq(rewardsPerMarket.supply, linearPrecision(epochId));
            expect(emissions.borrow).toBnApproxEq(rewardsPerMarket.borrow, linearPrecision(epochId));
          })
        );
      });
    }
  );
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
        const currentEpoch = await timestampToEpoch(block.timestamp);
        expect(currentEpoch).not.toBeUndefined();

        const epochConfig = await epochsBefore(currentEpoch.id, false).then((e) => e[e.length - 1]);
        expect(epochConfig).not.toBeUndefined();

        if (epochConfig.id === "age1-epoch2") return; // not check for root 2
        const usersBalances = await fetchUsers(SUBGRAPH_URL, epochConfig.finalBlock);
        const usersAccumulatedRewards = await Promise.all(
          usersBalances.map(async ({ address, balances }) => ({
            address,
            accumulatedRewards: sumRewards(
              await userBalancesToUnclaimedTokens(balances, epochConfig.finalTimestamp, provider, storageService)
            ).toString(), // with 18 * 2 decimals
          }))
        );
        const merkleRoot = computeMerkleTree(usersAccumulatedRewards.filter((r) => r.accumulatedRewards !== "0"));
        expect(merkleRoot.root.toLowerCase()).toEqual(rootEvent.args.newRoot);
      })
    );
  });
});

const linearPrecision = (epochId: string) => {
  const epochNumber = rawEpochs.findIndex((e) => e.id === epochId) + 1;
  return (Math.ceil(epochNumber / 3) * 1e18).toString();
};
