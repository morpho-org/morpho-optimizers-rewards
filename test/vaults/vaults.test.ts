import { BigNumber, constants } from "ethers";
import ProofsFetcher from "../../src/vaults/ProofsFetcher";
import { getAllProofs } from "../../src/utils/getCurrentOnChainDistribution";
import { parseUnits } from "ethers/lib/utils";
import { distributorFromEvents } from "./utils";
import { VaultEventType } from "../../src/vaults/Distributor";
import { allEpochs, EpochConfig } from "../../src";

describe.each(allEpochs.filter((epoch) => epoch.finalTimestamp.lt(Math.floor(Date.now() / 1000))))(
  "Vaults",
  (currentEpochConfig: EpochConfig) => {
    const vaultAddress = "0x6abfd6139c7c3cc270ee2ce132e309f59caaf6a2";
    const proofsFetcher = new ProofsFetcher();
    const epochConfig = proofsFetcher.getEpochFromId("age1-epoch1");

    const allProofs = getAllProofs();

    describe(`Epoch ${currentEpochConfig.number}`, () => {
      const currentProof = allProofs[allProofs.length - currentEpochConfig.number];

      it("Should distribute tokens to vaults users with only one user", async () => {
        const distributor = distributorFromEvents(vaultAddress, [
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
        const { lastMerkleTree: merkleTree } = await distributor.distributeMorpho(currentEpochConfig.id);
        expect(merkleTree).toBeDefined();
        expect(merkleTree).toHaveProperty("proofs");
        expect(merkleTree).toHaveProperty("root");

        expect(merkleTree.proofs[constants.AddressZero].amount).toBnApproxEq(
          currentProof.proofs[vaultAddress]!.amount,
          10
        );
      });
      it("Should distribute tokens to vaults users with two users", async () => {
        const distributor = distributorFromEvents(vaultAddress, [
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
        const { lastMerkleTree: merkleTree } = await distributor.distributeMorpho(currentEpochConfig.id);
        expect(merkleTree).toBeDefined();
        expect(merkleTree).toHaveProperty("proofs");
        expect(merkleTree).toHaveProperty("root");
        expect(merkleTree.proofs[constants.AddressZero].amount).toBeDefined();
        expect(merkleTree.proofs["0x0000000000000000000000000000000000000001"].amount).toBeDefined();

        const totalDistributed = Object.values(merkleTree.proofs).reduce(
          (acc, proof) => acc.add(proof.amount),
          BigNumber.from(0)
        );
        const totalVaultRewards = currentProof.proofs[vaultAddress]!.amount;

        expect(totalDistributed).toBnLte(totalVaultRewards);
        expect(totalDistributed).toBnApproxEq(totalVaultRewards, 10);
      });
      it("Should distribute all tokens when vaults has started being used during the epoch", async () => {
        const distributor = distributorFromEvents(vaultAddress, [
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
        const { lastMerkleTree: merkleTree } = await distributor.distributeMorpho(currentEpochConfig.id);
        expect(merkleTree).toBeDefined();
        expect(merkleTree).toHaveProperty("proofs");
        expect(merkleTree).toHaveProperty("root");
        expect(merkleTree.proofs[constants.AddressZero].amount).toBeDefined();
        expect(merkleTree.proofs["0x0000000000000000000000000000000000000001"].amount).toBeDefined();

        const totalDistributed = Object.values(merkleTree.proofs).reduce(
          (acc, proof) => acc.add(proof.amount),
          BigNumber.from(0)
        );
        const totalVaultRewards = BigNumber.from(currentProof.proofs[vaultAddress]!.amount);

        expect(totalDistributed).toBnLte(totalVaultRewards);
        expect(totalDistributed).toBnApproxEq(totalVaultRewards, 10);
      });
      it("Should not distribute MORPHO to a user that has deposit/withdraw in the same transaction", async () => {
        const distributor = distributorFromEvents(vaultAddress, [
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
        const { lastMerkleTree: merkleTree } = await distributor.distributeMorpho(currentEpochConfig.id);
        expect(merkleTree).toBeDefined();
        expect(merkleTree.proofs["0x0000000000000000000000000000000000000001"]?.amount).toBeUndefined();

        const totalDistributed = Object.values(merkleTree.proofs).reduce(
          (acc, proof) => acc.add(proof.amount),
          BigNumber.from(0)
        );
        const totalVaultRewards = currentProof.proofs[vaultAddress]!.amount;

        expect(totalDistributed).toBnLte(totalVaultRewards);
        expect(totalDistributed).toBnApproxEq(totalVaultRewards, 10);
      });
      it("Should distribute a part of MORPHO when user withdraws", async () => {
        const distributor = distributorFromEvents(vaultAddress, [
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
        const { lastMerkleTree: merkleTree } = await distributor.distributeMorpho(currentEpochConfig.id);
        expect(merkleTree).toBeDefined();
        expect(merkleTree.proofs[constants.AddressZero].amount).toBeDefined();
        expect(merkleTree.proofs["0x0000000000000000000000000000000000000001"].amount).toBeDefined();
        const totalDistributed = Object.values(merkleTree.proofs).reduce(
          (acc, proof) => acc.add(proof.amount),
          BigNumber.from(0)
        );
        const totalVaultRewards = currentProof.proofs[vaultAddress]!.amount;

        expect(totalDistributed).toBnLte(totalVaultRewards);
        expect(totalDistributed).toBnApproxEq(totalVaultRewards, 10);

        const distributorWithoutWithdrawal = distributorFromEvents(vaultAddress, [
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
        const { lastMerkleTree: merkleTreeWithoutWithdrawal } = await distributorWithoutWithdrawal.distributeMorpho(
          currentEpochConfig.id
        );
        const withoutWithdrawalAmount =
          merkleTreeWithoutWithdrawal.proofs["0x0000000000000000000000000000000000000001"]!.amount;
        expect(withoutWithdrawalAmount).toBnGt(merkleTree.proofs["0x0000000000000000000000000000000000000001"]!.amount);
      });

      it("Should distribute MORPHO when a transfer occurs for the receiver", async () => {
        const distributor = distributorFromEvents(vaultAddress, [
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
        const { lastMerkleTree: merkleTree } = await distributor.distributeMorpho(currentEpochConfig.id);
        expect(merkleTree).toBeDefined();
        expect(merkleTree.proofs[constants.AddressZero].amount).toBeDefined();
        expect(merkleTree.proofs["0x0000000000000000000000000000000000000001"].amount).toBeDefined();
        expect(merkleTree.proofs["0x0000000000000000000000000000000000000002"].amount).toBeDefined();
        const totalDistributed = Object.values(merkleTree.proofs).reduce(
          (acc, proof) => acc.add(proof.amount),
          BigNumber.from(0)
        );
        const totalVaultRewards = BigNumber.from(currentProof.proofs[vaultAddress]!.amount);

        expect(totalDistributed.lte(totalVaultRewards)).toBeTruthy();
        expect(totalDistributed).toBnLte(totalVaultRewards);
        expect(totalDistributed).toBnApproxEq(totalVaultRewards, 10);
      });
      if (currentEpochConfig.number > 1) {
        it("Should handle transaction on multiple epochs", async () => {
          const distributor = distributorFromEvents(vaultAddress, [
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
                blockNumber: currentEpochConfig.initialBlock! - 10000,
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
                blockNumber: currentEpochConfig.initialBlock! - 1000,
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
              type: VaultEventType.Deposit,
              event: {
                blockNumber: currentEpochConfig.initialBlock! + 10_000,
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
              type: VaultEventType.Deposit,
              event: {
                blockNumber: currentEpochConfig.initialBlock! + 1000,
                transactionIndex: 1,
                logIndex: 1,
                args: {
                  caller: "0x0000000000000000000000000000000000000002",
                  owner: "0x0000000000000000000000000000000000000002",
                  assets: parseUnits("1000"),
                  shares: parseUnits("1000"),
                },
              },
            },
          ]);
          const { lastMerkleTree: merkleTree } = await distributor.distributeMorpho(currentEpochConfig.id);
          expect(merkleTree).toBeDefined();
          expect(merkleTree.proofs[constants.AddressZero].amount).toBeDefined();
          expect(merkleTree.proofs["0x0000000000000000000000000000000000000001"].amount).toBeDefined();
          expect(merkleTree.proofs["0x0000000000000000000000000000000000000002"].amount).toBeDefined();
          const totalDistributed = Object.values(merkleTree.proofs).reduce(
            (acc, proof) => acc.add(proof.amount),
            BigNumber.from(0)
          );
          const totalVaultRewards = currentProof.proofs[vaultAddress]!.amount;
          expect(totalDistributed).toBnLte(totalVaultRewards);
          expect(totalDistributed).toBnApproxEq(totalVaultRewards, 100);
        });
      }
    });
  }
);
