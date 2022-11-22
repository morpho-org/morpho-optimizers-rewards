import {BigNumber, constants, providers} from "ethers";
import ProofsFetcher from "../src/vaults/ProofsFetcher";
import Distributor from "../src/vaults/Distributor";
import {EventsFetcherInterface} from "../src/vaults/VaultEventsFetcher";
import {TransactionEvents, VaultDepositEvent} from "../src/vaults/types";
import {getAllProofs} from "../src/utils/getCurrentOnChainDistribution";
import {EpochConfig} from "../src";
import {VaultEventType} from "../src/vaults/distributeVaults";
import {parseUnits} from "ethers/lib/utils";

describe("Vaults", ()  => {
    it("Should distribute tokens to vaults users with only deposits", async () => {
        const proofsFetcher = new ProofsFetcher();
        const allProofs = getAllProofs();
        const firstProof = allProofs[allProofs.length - 1];
        const epochConfig = proofsFetcher.getEpochFromId(firstProof.epoch);
        class EventFetcherOneDepositor implements EventsFetcherInterface {
            async fetchSortedEventsForEpoch(epochConfig: EpochConfig):Promise<[TransactionEvents[], BigNumber]>{
                // create deposit Event mock
                const event = {
                    blockNumber: epochConfig.initialBlock!,
                    transactionIndex: 1,
                    logIndex: 1,
                    args: {
                        caller: constants.AddressZero,
                        owner: constants.AddressZero,
                        assets: parseUnits("1000"),
                        shares: parseUnits("1000"),
                    },
                };
                // create ethers typed event with mock values
                const depositEvent: VaultDepositEvent = {
                    type: VaultEventType.Deposit,
                    event
                };
                return [[depositEvent], epochConfig.initialTimestamp];
            }
            async getBlock(blockNumber: number): Promise<providers.Block> {
                const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
                return provider.getBlock(blockNumber);
            }

        }
        const eventsFetcher = new EventFetcherOneDepositor();

        const distributor = new Distributor("0x00e043300ebebd0f68e1373cc2167eebdb21516c", eventsFetcher, proofsFetcher);

        const merkleTree = await distributor.distributeMorpho(epochConfig.id);
        expect(merkleTree).toBeDefined();
        expect(merkleTree).toHaveProperty("proofs");
        expect(merkleTree).toHaveProperty("root");

        expect(merkleTree.proofs[constants.AddressZero].amount).toEqual(firstProof.proofs["0x00e043300ebebd0f68e1373cc2167eebdb21516c"]!.amount);

    });

});