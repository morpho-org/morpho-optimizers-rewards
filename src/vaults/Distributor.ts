import { TransactionEvents, UserConfig } from "./types";
import { EventsFetcherInterface } from "./VaultEventsFetcher";
import { BigNumber, constants } from "ethers";
import { WadRayMath } from "@morpho-labs/ethers-utils/lib/maths";
import { DepositEvent, TransferEvent, WithdrawEvent } from "./contracts/ERC4626";
import { formatUnits } from "ethers/lib/utils";
import { computeMerkleTree } from "../utils";
import { ProofsFetcherInterface } from "./ProofsFetcher";
import { pow10 } from "@morpho-labs/ethers-utils/lib/utils";
import { EpochConfig } from "../ages";

export enum VaultEventType {
  Deposit = "DEPOSIT",
  Withdraw = "WITHDRAW",
  Transfer = "TRANSFER",
}

type MerkleTree = ReturnType<typeof computeMerkleTree>;

export default class Distributor {
  static readonly SCALING_FACTOR = pow10(36);
  public readonly vaultAddress: string;

  private _marketIndex = constants.Zero; // The index saving morpho accrued for Vault users
  private _lastTimestamp = constants.Zero; // The timestamp of the last marketIndex update
  private _totalSupply = constants.Zero; // The sum of the shares of all users
  private _morphoAccumulatedFromMainDistribution = constants.Zero; // The accumulated MORPHO claimable by the vault

  private _usersConfigs: Record<string, UserConfig | undefined> = {}; // Mapping containing the user related information

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

    let lastEpochDistributed = constants.Zero;
    const firstEpochId = epochsProofs[0]!.epoch;

    const trees: Record<string, MerkleTree> = {};

    for (const epochProofs of epochsProofs) {
      console.log(`Distributing MORPHO for ${epochProofs.epoch}...`);
      const epochConfig = this.proofsFetcher.getEpochFromId(epochProofs.epoch);
      const totalMorphoDistributed = BigNumber.from(epochProofs.proofs[this.vaultAddress]!.amount).sub(
        this._morphoAccumulatedFromMainDistribution
      );
      console.log(`Total MORPHO distributed: ${formatUnits(totalMorphoDistributed, 18)}`);
      this._morphoAccumulatedFromMainDistribution =
        this._morphoAccumulatedFromMainDistribution.add(totalMorphoDistributed);
      // timeFrom is the timestamp of the first block with a transaction during the current epoch.
      const [allEvents, timeFrom] = await this.eventsFetcher.fetchSortedEventsForEpoch(epochConfig);
      console.debug(timeFrom.toString());
      if (timeFrom.gt(this._lastTimestamp) && firstEpochId === epochConfig.id)
        // initiate the lastTimestamp to the first event timestamp
        this._lastTimestamp = timeFrom;

      const duration = epochConfig.finalTimestamp.sub(this._lastTimestamp);
      if (duration.lte(constants.Zero)) {
        //throw an error
        throw Error(`The duration of the epoch ${epochConfig.id} is not positive`);
      }
      const rate = totalMorphoDistributed.mul(Distributor.SCALING_FACTOR).div(duration);
      console.log(`${allEvents.length} events to process for ${epochConfig.id}...`);
      for (const transaction of allEvents) await this._handleTransaction(transaction, rate);

      // Process the end of the epoch
      // We have to distribute the MORPHO accrued from the last transaction to the end of the epoch for
      // each user with a positive supply balance.
      this._processEndOfEpoch(rate, epochConfig);

      // logging only

      const totalTokenEmitted = Object.values(this._usersConfigs).reduce((acc, user) => {
        if (!user) return acc;
        return acc.add(user.morphoAccrued);
      }, constants.Zero);

      console.log(
        `Total MORPHO emitted: ${formatUnits(totalTokenEmitted)} over ${formatUnits(
          this._morphoAccumulatedFromMainDistribution
        )} MORPHO available`
      );

      console.log(`Total MORPHO distributed during ${epochConfig.id}: ${formatUnits(lastEpochDistributed)}`);
      lastEpochDistributed = totalTokenEmitted;
      // process of the distribution and the merkle tree
      trees[epochConfig.id] = this._computeCurrentMerkleTree();
    }

    const lastEpochId = epochsProofs[epochsProofs.length - 1].epoch;
    return {
      lastMerkleTree: trees[lastEpochId],
      history: trees,
    };
  }

  private _updateMarketIndex(rate: BigNumber, timestampTo: BigNumber) {
    const timeDelta = timestampTo.sub(this._lastTimestamp);
    const morphoAccrued = timeDelta.mul(rate);
    if (this._totalSupply.gt(0))
      this._marketIndex = this._marketIndex.add(WadRayMath.wadDiv(morphoAccrued, this._totalSupply));
    this._lastTimestamp = BigNumber.from(timestampTo);
    return morphoAccrued;
  }

  private _processEndOfEpoch(rate: BigNumber, epochConfig: EpochConfig) {
    if (this._totalSupply.gt(0)) this._updateMarketIndex(rate, epochConfig.finalTimestamp);

    Object.values(this._usersConfigs).forEach((userConfig) => {
      if (!userConfig) return;
      userConfig.morphoAccrued = userConfig.morphoAccrued.add(
        WadRayMath.wadMul(this._marketIndex.sub(userConfig.index), userConfig.balance).div(Distributor.SCALING_FACTOR)
      );
      userConfig.index = this._marketIndex;
    });
  }

  private async _handleTransaction(transaction: TransactionEvents, rate: BigNumber) {
    // process event
    // we first update the global vault distribution
    const block = await this.eventsFetcher.getBlock(transaction.event.blockNumber);
    this._updateMarketIndex(rate, BigNumber.from(block.timestamp));

    // and then distribute to the user(s) of the transaction
    switch (transaction.type) {
      case VaultEventType.Deposit: {
        const event = transaction.event as DepositEvent;
        this._handleDeposit(event);
        break;
      }
      case VaultEventType.Withdraw: {
        const event = transaction.event as WithdrawEvent;
        this._handleWithdrawEvent(event);
        break;
      }
      case VaultEventType.Transfer: {
        const event = transaction.event as TransferEvent;
        this._handleTransferEvent(event);
        break;
      }
    }
  }

  private _handleDeposit(event: DepositEvent) {
    const userBalance = this._getUserConfig(event.args.owner);
    userBalance.morphoAccrued = userBalance.morphoAccrued.add(
      WadRayMath.wadMul(this._marketIndex.sub(userBalance.index), userBalance.balance).div(Distributor.SCALING_FACTOR)
    );
    userBalance.balance = userBalance.balance.add(event.args.shares);
    userBalance.index = BigNumber.from(this._marketIndex);
    this._totalSupply = this._totalSupply.add(event.args.shares);
  }

  private _handleWithdrawEvent(event: WithdrawEvent) {
    const userBalance = this._getUserConfig(event.args.caller);
    userBalance.morphoAccrued = userBalance.morphoAccrued.add(
      WadRayMath.wadMul(this._marketIndex.sub(userBalance.index), userBalance.balance).div(Distributor.SCALING_FACTOR)
    );
    userBalance.balance = userBalance.balance.sub(event.args.shares);
    userBalance.index = BigNumber.from(this._marketIndex);
    this._totalSupply = this._totalSupply.sub(event.args.shares);
  }

  private _handleTransferEvent(event: TransferEvent) {
    // accrue MORPHO for the 2 users
    if (event.args.from === constants.AddressZero || event.args.to === constants.AddressZero) return; // Mint or Burn
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
  }

  private _computeCurrentMerkleTree() {
    const usersRewards = Object.entries(this._usersConfigs)
      .map(([address, config]) => {
        if (config!.morphoAccrued.isZero()) return;
        return {
          address,
          accumulatedRewards: config!.morphoAccrued.toString(),
        };
      })
      .filter(Boolean) as { address: string; accumulatedRewards: string }[];
    return computeMerkleTree(usersRewards);
  }

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
    this._morphoAccumulatedFromMainDistribution = constants.Zero;
    this._usersConfigs = {};
  }
}
