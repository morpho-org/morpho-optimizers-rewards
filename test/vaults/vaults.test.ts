import { BigNumber, constants } from "ethers";
import ProofsFetcher from "../../src/vaults/ProofsFetcher";
import { getAllProofs } from "../../src/utils/getCurrentOnChainDistribution";
import { parseUnits } from "ethers/lib/utils";
import { expectBNApproxEquals } from "../ageOne/epochOne.test";
import { distributorFromEvents } from "./utils";
import { VaultEventType } from "../../src/vaults/Distributor";

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
  it("Should distribute all tokens when vault has started being used during the epoch", async () => {
    const proofsFetcher = new ProofsFetcher();
    const allProofs = getAllProofs();
    const firstProof = allProofs[allProofs.length - 1];
    const epochConfig = proofsFetcher.getEpochFromId(firstProof.epoch);
    const distributor = distributorFromEvents("0x00e043300ebebd0f68e1373cc2167eebdb21516c", [
      {
        type: VaultEventType.Deposit,
        event: {
          blockNumber: epochConfig.initialBlock! + 1000,
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
          blockNumber: epochConfig.initialBlock! + 2000,
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
    console.log(totalDistributed.toString(), totalVaultRewards.toString());
    expectBNApproxEquals(totalDistributed, totalVaultRewards, 10);
  });
  it("Should not distribute MORPHO to a user that has deposit/withdraw in the same transaction", async () => {
    const proofsFetcher = new ProofsFetcher();
    const allProofs = getAllProofs();
    const firstProof = allProofs[allProofs.length - 1];
    const epochConfig = proofsFetcher.getEpochFromId(firstProof.epoch);
    const distributor = distributorFromEvents("0x00e043300ebebd0f68e1373cc2167eebdb21516c", [
      {
        type: VaultEventType.Deposit,
        event: {
          blockNumber: epochConfig.initialBlock! + 1000,
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
          blockNumber: epochConfig.initialBlock! + 2000,
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
      {
        type: VaultEventType.Withdraw,
        event: {
          blockNumber: epochConfig.initialBlock! + 2000,
          transactionIndex: 1,
          logIndex: 2,
          args: {
            caller: "0x0000000000000000000000000000000000000001",
            receiver: "0x0000000000000000000000000000000000000001",
            owner: "0x0000000000000000000000000000000000000001",
            assets: parseUnits("1000"),
            shares: parseUnits("1000"),
          },
        },
      },
    ]);
    const merkleTree = await distributor.distributeMorpho(epochConfig.id);
    expect(merkleTree).toBeDefined();
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000001"]?.amount).toBeUndefined();

    const totalDistributed = Object.values(merkleTree.proofs).reduce(
      (acc, proof) => acc.add(proof.amount),
      BigNumber.from(0)
    );
    const totalVaultRewards = BigNumber.from(firstProof.proofs["0x00e043300ebebd0f68e1373cc2167eebdb21516c"]!.amount);

    expect(totalDistributed.lte(totalVaultRewards)).toBeTruthy();
    console.log(totalDistributed.toString(), totalVaultRewards.toString());
    expectBNApproxEquals(totalDistributed, totalVaultRewards, 10);
  });
  it("Should distribute a part of MORPHO when user withdraws", async () => {
    const proofsFetcher = new ProofsFetcher();
    const allProofs = getAllProofs();
    const firstProof = allProofs[allProofs.length - 1];
    const epochConfig = proofsFetcher.getEpochFromId(firstProof.epoch);
    const distributor = distributorFromEvents("0x00e043300ebebd0f68e1373cc2167eebdb21516c", [
      {
        type: VaultEventType.Deposit,
        event: {
          blockNumber: epochConfig.initialBlock! + 1000,
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
          blockNumber: epochConfig.initialBlock! + 2000,
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
      {
        type: VaultEventType.Withdraw,
        event: {
          blockNumber: epochConfig.initialBlock! + 3000,
          transactionIndex: 1,
          logIndex: 2,
          args: {
            caller: "0x0000000000000000000000000000000000000001",
            receiver: "0x0000000000000000000000000000000000000001",
            owner: "0x0000000000000000000000000000000000000001",
            assets: parseUnits("1200"),
            shares: parseUnits("1000"),
          },
        },
      },
    ]);
    const merkleTree = await distributor.distributeMorpho(epochConfig.id);
    expect(merkleTree).toBeDefined();
    expect(merkleTree.proofs[constants.AddressZero].amount).toBeDefined();
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000001"].amount).toBeDefined();
    const totalDistributed = Object.values(merkleTree.proofs).reduce(
      (acc, proof) => acc.add(proof.amount),
      BigNumber.from(0)
    );
    const totalVaultRewards = BigNumber.from(firstProof.proofs["0x00e043300ebebd0f68e1373cc2167eebdb21516c"]!.amount);

    expect(totalDistributed.lte(totalVaultRewards)).toBeTruthy();
    console.log(totalDistributed.toString(), totalVaultRewards.toString());
    expectBNApproxEquals(totalDistributed, totalVaultRewards, 10);

    const distributorWithoutWithdrawal = distributorFromEvents("0x00e043300ebebd0f68e1373cc2167eebdb21516c", [
      {
        type: VaultEventType.Deposit,
        event: {
          blockNumber: epochConfig.initialBlock! + 1000,
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
          blockNumber: epochConfig.initialBlock! + 2000,
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
    const merkleTreeWithoutWithdrawal = await distributorWithoutWithdrawal.distributeMorpho(epochConfig.id);
    const withoutWithdrawalAmount = BigNumber.from(
      merkleTreeWithoutWithdrawal.proofs["0x0000000000000000000000000000000000000001"]!.amount
    );
    expect(+withoutWithdrawalAmount.toString()).toBeGreaterThan(
      +merkleTree.proofs["0x0000000000000000000000000000000000000001"]!.amount
    );
  });
  it("Should distribute MORPHO when a transfer occurs for the receiver", async () => {
    const proofsFetcher = new ProofsFetcher();
    const allProofs = getAllProofs();
    const firstProof = allProofs[allProofs.length - 1];
    const epochConfig = proofsFetcher.getEpochFromId(firstProof.epoch);
    const distributor = distributorFromEvents("0x00e043300ebebd0f68e1373cc2167eebdb21516c", [
      {
        type: VaultEventType.Deposit,
        event: {
          blockNumber: epochConfig.initialBlock! + 1000,
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
          blockNumber: epochConfig.initialBlock! + 2000,
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
      {
        type: VaultEventType.Transfer,
        event: {
          blockNumber: epochConfig.initialBlock! + 3000,
          transactionIndex: 1,
          logIndex: 1,
          args: {
            from: "0x0000000000000000000000000000000000000001",
            to: "0x0000000000000000000000000000000000000002",
            value: parseUnits("100"),
          },
        },
      },
    ]);
    const merkleTree = await distributor.distributeMorpho(epochConfig.id);
    expect(merkleTree).toBeDefined();
    expect(merkleTree.proofs[constants.AddressZero].amount).toBeDefined();
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000001"].amount).toBeDefined();
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000002"].amount).toBeDefined();
    const totalDistributed = Object.values(merkleTree.proofs).reduce(
      (acc, proof) => acc.add(proof.amount),
      BigNumber.from(0)
    );
    const totalVaultRewards = BigNumber.from(firstProof.proofs["0x00e043300ebebd0f68e1373cc2167eebdb21516c"]!.amount);

    expect(totalDistributed.lte(totalVaultRewards)).toBeTruthy();
    console.log(totalDistributed.toString(), totalVaultRewards.toString());
    expectBNApproxEquals(totalDistributed, totalVaultRewards, 10);
  });
});
