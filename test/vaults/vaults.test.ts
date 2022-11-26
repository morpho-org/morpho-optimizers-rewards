import { BigNumber, constants } from "ethers";
import ProofsFetcher from "../../src/vaults/ProofsFetcher";
import { getAllProofs } from "../../src/utils/getCurrentOnChainDistribution";
import { parseUnits } from "ethers/lib/utils";
import { distributorFromEvents } from "./utils";
import { VaultEventType } from "../../src/vaults/Distributor";
import { allEpochs, EpochConfig } from "../../src";

describe("Vaults Distributor", () => {
  const vaultAddress = "0x6abfd6139c7c3cc270ee2ce132e309f59caaf6a2";
  const proofsFetcher = new ProofsFetcher();
  const epochConfig = proofsFetcher.getEpochFromId("age1-epoch1");
  const allProofs = getAllProofs();

  it("Should distribute to the Deposit owner", async () => {
    const distributor = distributorFromEvents(vaultAddress, [
      {
        type: VaultEventType.Deposit,
        event: {
          blockNumber: epochConfig.initialBlock!,
          transactionIndex: 1,
          logIndex: 1,
          args: {
            caller: constants.AddressZero,
            owner: "0x0000000000000000000000000000000000000001",
            assets: parseUnits("1000"),
            shares: parseUnits("1000"),
          },
        },
      },
    ]);
    const { lastMerkleTree: merkleTree } = await distributor.distributeMorpho(epochConfig.id);
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000001"]?.amount).toBeDefined();
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000000"]?.amount).toBeUndefined();
  });
  it("Should distribute to the Withdrawer owner", async () => {
    const distributor = distributorFromEvents(vaultAddress, [
      {
        type: VaultEventType.Deposit,
        event: {
          blockNumber: epochConfig.initialBlock!,
          transactionIndex: 1,
          logIndex: 1,
          args: {
            caller: constants.AddressZero,
            owner: "0x0000000000000000000000000000000000000001",
            assets: parseUnits("1000"),
            shares: parseUnits("1000"),
          },
        },
      },
      {
        type: VaultEventType.Deposit,
        event: {
          blockNumber: epochConfig.initialBlock!,
          transactionIndex: 1,
          logIndex: 1,
          args: {
            caller: constants.AddressZero,
            owner: "0x0000000000000000000000000000000000000010",
            assets: parseUnits("1000"),
            shares: parseUnits("1000"),
          },
        },
      },
      {
        type: VaultEventType.Withdraw,
        event: {
          blockNumber: epochConfig.initialBlock! + 1000,
          transactionIndex: 1,
          logIndex: 1,
          args: {
            owner: "0x0000000000000000000000000000000000000001",
            receiver: "0x0000000000000000000000000000000000000002",
            caller: "0x0000000000000000000000000000000000000003",
            assets: parseUnits("1000"),
            shares: parseUnits("1000"),
          },
        },
      },
    ]);
    const { lastMerkleTree: merkleTree } = await distributor.distributeMorpho(epochConfig.id);
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000001"]?.amount).toBeDefined();
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000010"]?.amount).toBeDefined();
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000000"]?.amount).toBeUndefined();
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000002"]?.amount).toBeUndefined();
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000003"]?.amount).toBeUndefined();
  });
  it("Should distribute to the Transfer receiver", async () => {
    const distributor = distributorFromEvents(vaultAddress, [
      {
        type: VaultEventType.Deposit,
        event: {
          blockNumber: epochConfig.initialBlock!,
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
          blockNumber: epochConfig.initialBlock!,
          transactionIndex: 1,
          logIndex: 2,
          args: {
            from: "0x0000000000000000000000000000000000000001",
            to: "0x0000000000000000000000000000000000000002",
            value: parseUnits("1000"),
          },
        },
      },
    ]);
    const { lastMerkleTree: merkleTree } = await distributor.distributeMorpho(epochConfig.id);
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000001"]?.amount).toBeUndefined();
    expect(merkleTree.proofs["0x0000000000000000000000000000000000000002"]?.amount).toBeDefined();
  });
  it("Should throw an error if there is no MORPHO to distribute", async () => {
    const distributor = distributorFromEvents(constants.AddressZero, [
      {
        type: VaultEventType.Deposit,
        event: {
          blockNumber: epochConfig.initialBlock!,
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
    await expect(distributor.distributeMorpho(epochConfig.id)).rejects.toThrowError(
      "No MORPHO distributed for the vault 0x0000000000000000000000000000000000000000 in epoch age1-epoch1"
    );
  });
  it("Should throw an error if there is no Events", async () => {
    const distributor = distributorFromEvents(vaultAddress, []);
    await expect(distributor.distributeMorpho(epochConfig.id)).rejects.toThrowError(
      "Number of MORPHO remaining in the vault exceeds the threshold of 0.0001 for the Vault 0x6abfd6139c7c3cc270ee2ce132e309f59caaf6a2 in age1-epoch1"
    );
  });

  describe.each(allEpochs.filter((epoch) => epoch.finalTimestamp.lt(Math.floor(Date.now() / 1000))))(
    "Vaults Epochs",
    (currentEpochConfig: EpochConfig) => {
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
          expect(withoutWithdrawalAmount).toBnGt(
            merkleTree.proofs["0x0000000000000000000000000000000000000001"]!.amount
          );
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
                  blockNumber: currentEpochConfig.initialBlock! - 10_000,
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
});
