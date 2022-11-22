import { DepositEventObject, TransferEventObject, WithdrawEventObject } from "./contracts/ERC4626";
import { BigNumber } from "ethers";
import { VaultEventType } from "./Distributor";

export interface VaultDepositEvent {
  type: VaultEventType.Deposit;
  event: {
    transactionIndex: number;
    logIndex: number;
    blockNumber: number;
    args: DepositEventObject;
  };
}
export interface VaultWithdrawEvent {
  type: VaultEventType.Withdraw;

  event: {
    transactionIndex: number;
    logIndex: number;
    blockNumber: number;
    args: WithdrawEventObject;
  };
}
export interface VaultTransferEvent {
  type: VaultEventType.Transfer;
  event: {
    transactionIndex: number;
    logIndex: number;
    blockNumber: number;
    args: TransferEventObject;
  };
}
export type TransactionEvents = VaultDepositEvent | VaultWithdrawEvent | VaultTransferEvent;

export interface UserConfig {
  index: BigNumber;
  balance: BigNumber;
  morphoAccrued: BigNumber;
}
