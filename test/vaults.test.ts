import { BigNumber, constants } from "ethers";
import ProofsFetcher from "../src/vaults/ProofsFetcher";
import { getAllProofs } from "../src/utils/getCurrentOnChainDistribution";
import { VaultEventType } from "../src/vaults/distributeVaults";
import { parseUnits } from "ethers/lib/utils";
import { expectBNApproxEquals } from "./ageOne/epochOne.test";
import { distributorFromEvents } from "./vaults/utils";

describe("Vaults", () => {
  it("Should distribute tokens to vaults users with only one user", async () => {
    const allProofs = getAllProofs();
    const proofsFetcher = new ProofsFetcher();

    const firstProof = allProofs[allProofs.length - 1];
    const epochConfig = proofsFetcher.getEpochFromId(firstProof.epoch);
    const distributor = distributorFromEvents("0x00e043300ebebd0f68e1373cc2167eebdb21516c", [
      {
        type: VaultEventType.Deposit,
        event: {
          blockNumber: epochConfig.initialBlock!,
          transactionIndex: 1,
          logIndex: 1,
          args: {
            caller: constants.AddressZero,
            owner: constants.AddressZero,
            assets: parseUnits("1000"),
            shares: parseUnits("1000"),
          },
        },
      },
    ]);
    const merkleTree = await distributor.distributeMorpho(epochConfig.id);
    expect(merkleTree).toBeDefined();
    expect(merkleTree).toHaveProperty("proofs");
    expect(merkleTree).toHaveProperty("root");
    expectBNApproxEquals(
      BigNumber.from(merkleTree.proofs[constants.AddressZero].amount),
      BigNumber.from(firstProof.proofs["0x00e043300ebebd0f68e1373cc2167eebdb21516c"]!.amount),
      10
    );
  });
  it("Should distribute tokens to vaults users with two users", async () => {
    const proofsFetcher = new ProofsFetcher();
    const allProofs = getAllProofs();
    const firstProof = allProofs[allProofs.length - 1];
    const epochConfig = proofsFetcher.getEpochFromId(firstProof.epoch);
    const distributor = distributorFromEvents("0x00e043300ebebd0f68e1373cc2167eebdb21516c", [
      {
        type: VaultEventType.Deposit,
        event: {
          blockNumber: epochConfig.initialBlock!,
          transactionIndex: 1,
          logIndex: 1,
          args: {
            caller: constants.AddressZero,
            owner: constants.AddressZero,
            assets: parseUnits("1000"),
            shares: parseUnits("1000"),
          },
        },
      },
      {
        type: VaultEventType.Deposit,
        event: {
          blockNumber: epochConfig.initialBlock! + 1000,
          transactionIndex: 1,
          logIndex: 1,
          args: {
            caller: "0x0000000000000000000000000000000000000001",
            owner: "0x0000000000000000000000000000000000000001",
            assets: parseUnits("1000"),
            shares: parseUnits("1000"),
          },
        },
      },
    ]);
    const merkleTree = await distributor.distributeMorpho(epochConfig.id);
    expect(merkleTree).toBeDefined();
    expect(merkleTree).toHaveProperty("proofs");
    expect(merkleTree).toHaveProperty("root");
    expect(merkleTree.proofs[constants.AddressZero].amount).toBeDefined();
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000001"].amount).toBeDefined();

    const totalDistributed = Object.values(merkleTree.proofs).reduce(
      (acc, proof) => acc.add(proof.amount),
      BigNumber.from(0)
    );
    const totalVaultRewards = BigNumber.from(firstProof.proofs["0x00e043300ebebd0f68e1373cc2167eebdb21516c"]!.amount);

    expect(totalDistributed.lte(totalVaultRewards)).toBeTruthy();
    expectBNApproxEquals(totalDistributed, totalVaultRewards, 10);
  });
});
