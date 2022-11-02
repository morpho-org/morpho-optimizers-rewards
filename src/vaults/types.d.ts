import { DepositEvent, TransferEvent, WithdrawEvent } from "./contracts/ERC4626";
import { BigNumber } from "ethers";

export interface VaultDepositEvent {
  type: VaultEventType.Deposit;
  event: DepositEvent;
}
export interface VaultWithdrawEvent {
  type: VaultEventType.Withdraw;
  event: WithdrawEvent;
}
export interface VaultTransferEvent {
  type: VaultEventType.Transfer;
  event: TransferEvent;
}
export type TransactionEvents = VaultDepositEvent | VaultWithdrawEvent | VaultTransferEvent;

export interface UserConfig {
  index: BigNumber;
  balance: BigNumber;
  morphoAccrued: BigNumber;
}
