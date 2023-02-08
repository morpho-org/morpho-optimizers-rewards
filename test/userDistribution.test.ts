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
import { BigNumber, providers } from "ethers";
import { RootUpdatedEvent } from "@morpho-labs/morpho-ethers-contract/lib/RewardsDistributor";
import { RewardsDistributor__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { getPrevEpoch } from "../src/utils/timestampToEpoch";
import { sumRewards, VERSION_2_TIMESTAMP } from "../src/utils/getUserRewards";

describe.each([...ages])("Age Users Distribution", (age) => {
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
  const now = Math.floor(Date.now() / 1000);
  describe.each(age.epochs)(`Epochs distribution for ${age.ageName}`, (epochConfig) => {
    if (epochConfig.finalTimestamp.gt(now)) return;
    let usersBalances: UserBalances[];
    let usersAccumulatedRewards: { address: string; accumulatedRewards: string }[];
    beforeAll(async () => {
      usersBalances = await fetchUsers(SUBGRAPH_URL, epochConfig.finalBlock);
      usersAccumulatedRewards = await Promise.all(
        usersBalances.map(async ({ address, balances }) => ({
          address,
          accumulatedRewards: sumRewards(
            await userBalancesToUnclaimedTokens(balances, epochConfig.finalTimestamp, provider)
          ).toString(), // with 18 * 2 decimals
        }))
      );
    });

    it(`Should distribute the correct number of tokens over Morpho users for epoch ${epochConfig.id}`, async () => {
      const totalEmitted = usersAccumulatedRewards.reduce((a, b) => a.add(b.accumulatedRewards), BigNumber.from(0));
      const accumulatedEmission = getAccumulatedEmission(epochConfig.id); // we sum the emissions
      expect(totalEmitted).toBnApproxEq(accumulatedEmission, linearPrecision(epochConfig.number));
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
        const epochConfig = getPrevEpoch(timestampToEpoch(block.timestamp)!.epoch.id);
        expect(epochConfig).not.toBeUndefined();

        if (epochConfig!.epoch.id === "age1-epoch2") return; // not check for root 2
        const usersBalances = await fetchUsers(SUBGRAPH_URL, epochConfig!.epoch.finalBlock);
        const usersAccumulatedRewards = await Promise.all(
          usersBalances.map(async ({ address, balances }) => ({
            address,
            accumulatedRewards: sumRewards(
              await userBalancesToUnclaimedTokens(balances, epochConfig!.epoch.finalTimestamp, provider)
            ).toString(), // with 18 * 2 decimals
          }))
        );
        const merkleRoot = computeMerkleTree(usersAccumulatedRewards.filter((r) => r.accumulatedRewards !== "0"));
        expect(merkleRoot.root.toLowerCase()).toEqual(rootEvent.args.newRoot);
      })
    );
  });
});

const linearPrecision = (epochNumber: number) => (epochNumber >= 6 ? 2e18 : 1e18).toString();
