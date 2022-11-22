import { UserConfig } from "./types";
import { EventsFetcherInterface } from "./VaultEventsFetcher";
import { BigNumber, constants } from "ethers";
import { WadRayMath } from "@morpho-labs/ethers-utils/lib/maths";
import { DepositEvent, TransferEvent, WithdrawEvent } from "./contracts/ERC4626";
import { formatUnits } from "ethers/lib/utils";
import { computeMerkleTree } from "../utils";
import { VaultEventType } from "./distributeVaults";
import { ProofsFetcherInterface } from "./ProofsFetcher";
import { pow10 } from "@morpho-labs/ethers-utils/lib/utils";

export default class Distributor {
  static SCALING_FACTOR = pow10(36);
  private vaultAddress: string;

  private _marketIndex = constants.Zero;
  private _lastTimestamp = constants.Zero;
  private _totalSupply = constants.Zero;
  private _usersConfigs: Record<string, UserConfig | undefined> = {};

  private _getUserConfig(address: string) {
    let userConfig = this._usersConfigs[address.toLowerCase()];
    if (!userConfig) {
      userConfig = {
        index: BigNumber.from(this._marketIndex),
        balance: constants.Zero,
        morphoAccrued: constants.Zero,
      };
      this._usersConfigs[address.toLowerCase()] = userConfig;
    }
    return userConfig;
  }
  private _clean() {
    this._marketIndex = constants.Zero;
    this._lastTimestamp = constants.Zero;
    this._totalSupply = constants.Zero;
    this._usersConfigs = {};
  }
  constructor(
    vaultAddress: string,
    private readonly eventsFetcher: EventsFetcherInterface,
    private readonly proofsFetcher: ProofsFetcherInterface
  ) {
    this.vaultAddress = vaultAddress.toLowerCase();
  }

  async distributeMorpho(epochToId?: string) {
    this._clean();
    const epochsProofs = await this.proofsFetcher.fetchProofs(this.vaultAddress, epochToId);
    if (!epochsProofs?.length)
      throw Error(`No MORPHO distributed for the vault ${this.vaultAddress} in epoch ${epochToId}`);

    let morphoAccumulatedFromMainDistribution = constants.Zero;
    let lastEpochDistributed = constants.Zero;
    for (const epochProofs of epochsProofs) {
      const epochConfig = this.proofsFetcher.getEpochFromId(epochProofs.epoch);
      const totalMorphoDistributed = BigNumber.from(epochProofs.proofs[this.vaultAddress]!.amount);
      morphoAccumulatedFromMainDistribution = morphoAccumulatedFromMainDistribution.add(totalMorphoDistributed);

      console.time(epochConfig.id);
      const [allEvents, timeFrom] = await this.eventsFetcher.fetchSortedEventsForEpoch(epochConfig);
      console.debug(timeFrom.toString());
      if (timeFrom.gt(this._lastTimestamp))
        // initiate the lastTimestamp to the first event timestamp
        this._lastTimestamp = timeFrom;

      const duration = epochConfig.finalTimestamp.sub(timeFrom);
      const rate = totalMorphoDistributed.mul(Distributor.SCALING_FACTOR).div(duration);

      for (const transaction of allEvents) {
        // process event
        // we first update the global vault distribution
        const block = await this.eventsFetcher.getBlock(transaction.event.blockNumber);
        const morphoAccrued = rate.mul(BigNumber.from(block.timestamp).sub(this._lastTimestamp)); // number of MORPHO accrued for all users
        if (this._totalSupply.gt(0))
          this._marketIndex = this._marketIndex.add(WadRayMath.wadDiv(morphoAccrued, this._totalSupply)); // distribute over users

        this._lastTimestamp = BigNumber.from(block.timestamp);

        // and then distribute to the user(s) of the transaction
        switch (transaction.type) {
          case VaultEventType.Deposit: {
            const event = transaction.event as DepositEvent;

            const userBalance = this._getUserConfig(event.args.owner);
            userBalance.morphoAccrued = userBalance.morphoAccrued.add(
              WadRayMath.wadMul(this._marketIndex.sub(userBalance.index), userBalance.balance).div(
                Distributor.SCALING_FACTOR
              )
            );
            userBalance.balance = userBalance.balance.add(event.args.shares);
            userBalance.index = BigNumber.from(this._marketIndex);
            this._totalSupply = this._totalSupply.add(event.args.shares);
            break;
          }
          case VaultEventType.Withdraw: {
            const event = transaction.event as WithdrawEvent;
            const userBalance = this._getUserConfig(event.args.caller);
            userBalance.morphoAccrued = userBalance.morphoAccrued.add(
              WadRayMath.wadMul(this._marketIndex.sub(userBalance.index), userBalance.balance).div(
                Distributor.SCALING_FACTOR
              )
            );
            userBalance.balance = userBalance.balance.sub(event.args.shares);
            userBalance.index = BigNumber.from(this._marketIndex);
            this._totalSupply = this._totalSupply.sub(event.args.shares);
            break;
          }
          case VaultEventType.Transfer: {
            // accrue MORPHO for the 2 users
            const event = transaction.event as TransferEvent;
            const userFromBalance = this._getUserConfig(event.args.from);
            userFromBalance.morphoAccrued = userFromBalance.morphoAccrued.add(
              WadRayMath.wadMul(this._marketIndex.sub(userFromBalance.index), userFromBalance.balance).div(
                Distributor.SCALING_FACTOR
              )
            );
            userFromBalance.balance = userFromBalance.balance.sub(event.args.value);
            userFromBalance.index = BigNumber.from(this._marketIndex);

            const userToBalance = this._getUserConfig(event.args.to);
            userToBalance.morphoAccrued = userToBalance.morphoAccrued.add(
              WadRayMath.wadMul(this._marketIndex.sub(userToBalance.index), userToBalance.balance).div(
                Distributor.SCALING_FACTOR
              )
            );
            userToBalance.balance = userToBalance.balance.add(event.args.value);
            userToBalance.index = BigNumber.from(this._marketIndex);
            break;
          }
        }
      }

      // and process the end of the epoch

      const morphoAccrued = rate.mul(BigNumber.from(epochConfig.finalTimestamp).sub(this._lastTimestamp)); // number of MORPHO accrued for all users
      this._marketIndex = this._marketIndex.add(WadRayMath.wadDiv(morphoAccrued, this._totalSupply)); // distribute over users
      this._lastTimestamp = BigNumber.from(epochConfig.finalTimestamp);

      Object.values(this._usersConfigs).forEach((userConfig) => {
        if (!userConfig) return;
        userConfig.morphoAccrued = userConfig.morphoAccrued.add(
          WadRayMath.wadMul(this._marketIndex.sub(userConfig.index), userConfig.balance).div(Distributor.SCALING_FACTOR)
        );
        userConfig.index = this._marketIndex;
      });

      const totalTokenEmitted = Object.values(this._usersConfigs).reduce((acc, user) => {
        if (!user) return acc;
        return acc.add(user.morphoAccrued);
      }, constants.Zero);
      console.timeLog(
        epochConfig.id,
        "Total token emitted overall:",
        formatUnits(totalTokenEmitted),
        "over",
        formatUnits(morphoAccumulatedFromMainDistribution)
      );

      console.timeLog(
        epochConfig.id,
        "Emitted during the current epoch: ",
        formatUnits(totalTokenEmitted.sub(lastEpochDistributed))
      );
      lastEpochDistributed = totalTokenEmitted;
      console.timeEnd(epochConfig.id);
    }

    // process of the distribution and the merkle tree
    const usersRewards = Object.entries(this._usersConfigs).map(([address, config]) => ({
      address,
      accumulatedRewards: config!.morphoAccrued.toString(),
    }));
    return computeMerkleTree(usersRewards);
    //
    // const lastEpochId = epochsProofs[epochsProofs.length - 1].epoch;
    // // save merkle tree
    // await fs.promises.mkdir(`distribution/vaults/${lastEpochId}`, { recursive: true });
    // await fs.promises.writeFile(
    //     `distribution/vaults/${lastEpochId}/${this.vaultAddress}.json`,
    //     JSON.stringify({ epoch: lastEpochId, ...merkleTree }, null, 4)
    // );
    //
    // console.timeLog("Distribution", "Root:", merkleTree.root);
    //
    // console.timeEnd("Distribution");
  }
}
