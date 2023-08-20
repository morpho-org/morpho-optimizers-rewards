import { computeMerkleTree, fetchUsers, UserBalances, userBalancesToUnclaimedTokens } from "../src/utils";
import { SUBGRAPH_URL } from "../src/config";
import { BigNumber, constants, providers } from "ethers";
import { RootUpdatedEvent } from "@morpho-labs/morpho-ethers-contract/lib/RewardsDistributor";
import { RewardsDistributor__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { MarketRewards, sumRewards, getAccumulatedEmissionPerMarket } from "../src/utils";
import { FileSystemStorageService } from "../src/utils/StorageService";
import { epochUtils } from "../src";
import rawEpochs from "../src/age-epochs.json";
import { parseDate, now } from "../src/helpers";
import { parseUnits } from "ethers/lib/utils";

const storageService = new FileSystemStorageService();

const EPOCH_DERIVATION_MAX = parseUnits("2");
const EPOCH_PRECISION_PER_MARKET = parseUnits("4"); // TODO: to be refined

const usersAccumulatedRewards: {
  [epoch: string]: { address: string; accumulatedRewards: string; rewards: MarketRewards[] }[];
} = {};
describe("User distribution", () => {
  beforeAll(async () => {
    // fill the block cache
    // TODO: find a better way to do this
    await epochUtils.finishedEpochs();
  });

  describe.each(rawEpochs.filter((e) => parseDate(e.finalTimestamp) < now()))(
    "Epoch Users Distribution e2e",
    (rawEpoch) => {
      const { id: epochId } = rawEpoch;
      let epoch: epochUtils.ParsedAgeEpochConfig;

      const provider = new providers.JsonRpcProvider(process.env.RPC_URL);

      let usersBalances: UserBalances[];

      beforeAll(async () => {
        epoch = await epochUtils.getEpoch(epochId);
        usersBalances = await fetchUsers(SUBGRAPH_URL, epoch.finalBlock);
        usersAccumulatedRewards[epochId] = await Promise.all(
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

      it.skip(`Should distribute the correct number of tokens over Morpho users for ${epochId}`, async () => {
        const totalEmitted = usersAccumulatedRewards[epochId].reduce(
          (a, b) => a.add(b.accumulatedRewards),
          BigNumber.from(0)
        );
        const epochNumber = rawEpochs.indexOf(rawEpoch);
        const totalEmittedPrev =
          epochNumber === 0
            ? constants.Zero
            : usersAccumulatedRewards[rawEpochs[epochNumber - 1].id].reduce(
                (a, b) => a.add(b.accumulatedRewards),
                constants.Zero
              );
        const totalEpochEmitted = totalEmitted.sub(totalEmittedPrev);
        expect(totalEpochEmitted).toBnApproxEq(
          parseUnits(rawEpoch.distributionParameters.totalEmission),
          EPOCH_DERIVATION_MAX
        );
      });

      it.skip(`Should distribute the correct number of tokens per market for epoch ${epochId}`, async () => {
        const markets = [...new Set(usersBalances.map((ub) => ub.balances.map((b) => b.market.address)).flat())];
        await Promise.all(
          markets.map(async (marketAddress) => {
            const emissions = await getAccumulatedEmissionPerMarket(marketAddress, epochId, storageService);
            const rewardsPerMarket = usersAccumulatedRewards[epochId].reduce(
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
            expect(emissions.supply).toBnApproxEq(rewardsPerMarket.supply, EPOCH_PRECISION_PER_MARKET);
            expect(emissions.borrow).toBnApproxEq(rewardsPerMarket.borrow, EPOCH_PRECISION_PER_MARKET);
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

  it.skip("Should have correct roots", async () => {
    await Promise.all(
      rootUpdates.map(async (rootEvent) => {
        const block = await rootEvent.getBlock();
        const currentEpoch = await epochUtils.timestampToEpoch(block.timestamp);
        expect(currentEpoch).not.toBeUndefined();

        const epochConfig = await epochUtils.epochsBefore(currentEpoch.id, false).then((e) => e[e.length - 1]);
        expect(epochConfig).not.toBeUndefined();

        if (epochConfig.id === "age1-epoch2") return; // not check for root 2
        const merkleRoot = computeMerkleTree(
          usersAccumulatedRewards[epochConfig.id].filter((r) => r.accumulatedRewards !== "0")
        );
        expect(merkleRoot.root.toLowerCase()).toEqual(rootEvent.args.newRoot);
      })
    );
  });
});
