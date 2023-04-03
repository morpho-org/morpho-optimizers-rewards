import { TransactionEvents, UserConfig } from "./types";
import { EventsFetcherInterface } from "./VaultEventsFetcher";
import { BigNumber, constants } from "ethers";
import { WadRayMath } from "@morpho-labs/ethers-utils/lib/maths";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { computeMerkleTree } from "../utils";
import { ProofsFetcherInterface } from "./ProofsFetcher";
import { pow10 } from "@morpho-labs/ethers-utils/lib/utils";
import { EpochConfig } from "../ages";
import {
  DepositEvent,
  TransferEvent,
  WithdrawEvent,
} from "@morpho-labs/morpho-ethers-contract/lib/aave-v2/mainnet/MorphoAaveV2SupplyVault";

export enum VaultEventType {
  Deposit = "DEPOSIT",
  Withdraw = "WITHDRAW",
  Transfer = "TRANSFER",
}

type MerkleTree = ReturnType<typeof computeMerkleTree>;

export default class Distributor {
  static readonly SCALING_FACTOR = pow10(36);
  static readonly MORPHO_DUST = parseUnits("0.0001"); // The maximum amount of token that will remain in the vault after the distribution due to dust
  public readonly vaultAddress: string;

  private _marketIndex = constants.Zero; // The index saving morpho accrued for Vault users
  private _lastTimestamp = constants.Zero; // The timestamp of the last marketIndex update
  private _totalSupply = constants.Zero; // The sum of the shares of all users
  private _morphoAccumulatedFromMainDistribution = constants.Zero; // The accumulated MORPHO claimable by the vaults

  private _usersConfigs: Record<string, UserConfig | undefined> = {}; // Mapping containing the user related information

  constructor(
    vaultAddress: string,
    private readonly eventsFetcher: EventsFetcherInterface,
    private readonly proofsFetcher: ProofsFetcherInterface
  ) {
    this.vaultAddress = vaultAddress.toLowerCase();
  }

  async distributeMorpho(epochToNumber?: number) {
    this._clean();
    const epochsProofs = await this.proofsFetcher.fetchProofs(this.vaultAddress, epochToNumber);
    if (!epochsProofs.length)
      throw Error(`No MORPHO distributed for the vault ${this.vaultAddress} in epoch ${epochToNumber}`);

    const firstEpochNumber = epochsProofs[0].epochNumber;

    const trees: Record<string, MerkleTree> = {};

    for (const epochProofs of epochsProofs) {
      console.log(`Distributing MORPHO for epoch ${epochProofs.epochNumber}...`);
      const epochConfig = this.proofsFetcher.getEpochFromNumber(epochProofs.epochNumber);

      const totalMorphoDistributed = BigNumber.from(epochProofs.proofs[this.vaultAddress]!.amount).sub(
        this._morphoAccumulatedFromMainDistribution
      );

      console.log(`Total MORPHO distributed: ${formatUnits(totalMorphoDistributed, 18)}`);
      this._morphoAccumulatedFromMainDistribution = BigNumber.from(epochProofs.proofs[this.vaultAddress]!.amount);

      // timeFrom is the timestamp of the first block with a transaction during the current epoch.
      const [allEvents, timeFrom] = await this.eventsFetcher.fetchSortedEventsForEpoch(epochConfig);

      if (timeFrom.gt(this._lastTimestamp) && firstEpochNumber === epochConfig.number)
        // initiate the lastTimestamp to the first event timestamp
        this._lastTimestamp = timeFrom;

      const duration = epochConfig.finalTimestamp.sub(this._lastTimestamp);
      if (duration.lte(constants.Zero)) {
        // throw an error
        throw Error(`The duration of the epoch n ${epochConfig.number} is not positive`);
      }
      const rate = totalMorphoDistributed.mul(Distributor.SCALING_FACTOR).div(duration);
      console.log(`${allEvents.length} events to process for epoch ${epochConfig.number}...`);
      for (const transaction of allEvents) await this._handleTransaction(transaction, rate);

      // Process the end of the epoch
      // We have to distribute the MORPHO accrued from the last transaction to the end of the epoch for
      // each user with a positive supply balance.
      this._processEndOfEpoch(rate, epochConfig);

      // process of the distribution and the merkle tree
      trees[epochConfig.number] = this._computeCurrentMerkleTree();
    }
    const totalTokenEmitted = Object.values(this._usersConfigs).reduce((acc, user) => {
      if (!user) return acc;
      return acc.add(user.morphoAccrued);
    }, constants.Zero);
    const morphoRemaining = this._morphoAccumulatedFromMainDistribution.sub(totalTokenEmitted);
    if (morphoRemaining.gt(Distributor.MORPHO_DUST))
      throw Error(
        `Number of MORPHO remaining in the vault exceeds the threshold of ${formatUnits(
          Distributor.MORPHO_DUST
        )} for the Vault ${this.vaultAddress} in epoch ${epochToNumber}`
      );

    const lastEpochId = epochsProofs[epochsProofs.length - 1].epochNumber;
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
    // we first update the global vaults distribution
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
    this._increaseUserBalance(event.args.owner, event.args.shares);
  }

  private _handleWithdrawEvent(event: WithdrawEvent) {
    this._decreaseUserBalance(event.args.owner, event.args.shares);
  }

  private _handleTransferEvent(event: TransferEvent) {
    // accrue MORPHO for the 2 users
    if (event.args.from === constants.AddressZero || event.args.to === constants.AddressZero) return; // Mint or Burn
    this._decreaseUserBalance(event.args.from, event.args.value);
    this._increaseUserBalance(event.args.to, event.args.value);
  }

  private _beforeBalanceUpdate(address: string) {
    const userBalance = this._getUserConfig(address);
    userBalance.morphoAccrued = userBalance.morphoAccrued.add(
      WadRayMath.wadMul(this._marketIndex.sub(userBalance.index), userBalance.balance).div(Distributor.SCALING_FACTOR)
    );
    userBalance.index = BigNumber.from(this._marketIndex); // clone BigNumber
    return userBalance;
  }
  private _increaseUserBalance(address: string, amount: BigNumber) {
    const userBalance = this._beforeBalanceUpdate(address);
    userBalance.balance = userBalance.balance.add(amount);
    this._totalSupply = this._totalSupply.add(amount);
  }
  private _decreaseUserBalance(address: string, amount: BigNumber) {
    const userBalance = this._beforeBalanceUpdate(address);

    userBalance.balance = userBalance.balance.sub(amount);
    if (userBalance.balance.lt(0)) {
      throw Error(`User ${address} has a negative balance of ${userBalance.balance.toString()}`);
    }
    this._totalSupply = this._totalSupply.sub(amount);
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
