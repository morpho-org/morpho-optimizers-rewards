import {
  describe,
  test,
  beforeEach,
  clearStore,
  newMockEvent,
  assert,
} from "matchstick-as/assembly/index";
import { Supplied } from "../generated/Morpho/Morpho";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { startEpochBlockTimestamp } from "../src/config";
import { handleSupplied } from "../src/mapping";
import { User } from "../generated/schema";
beforeEach(() => {
  clearStore(); // <-- clear the store before each test in the file
});
const user1 = Address.fromString("0x0000000000000000000000000000000000000000");
const cUsdc = Address.fromString("0x39aa39c021dfbae8fac545936693ac917d5e7563");
describe("Check of the total distribution", () => {
  test("Should distribute all rewards of one market to one user", () => {
    const mockEvent = newMockEvent();
    mockEvent.block.timestamp = startEpochBlockTimestamp.plus(BigInt.fromI32(3600));
    const supply = new Supplied(
      mockEvent.address,
      mockEvent.logIndex,
      mockEvent.transactionLogIndex,
      mockEvent.logType,
      mockEvent.block,
      mockEvent.transaction,
      []
    );
    supply.parameters = new Array<ethereum.EventParam>();
    const supplier = new ethereum.EventParam("_supplier", ethereum.Value.fromAddress(user1));
    const onBehalf = new ethereum.EventParam("_onBehalf", ethereum.Value.fromAddress(user1));
    const poolTokenAddress = new ethereum.EventParam(
      "_poolTokenAddress",
      ethereum.Value.fromAddress(cUsdc)
    );
    const amount = new ethereum.EventParam("_amount", ethereum.Value.fromI32(10_000_000));
    const balanceOnPool = new ethereum.EventParam("_balanceOnPool", ethereum.Value.fromI32(10_000));
    const balanceInP2P = new ethereum.EventParam("_balanceInP2P", ethereum.Value.fromI32(0));
    supply.parameters = [supplier, onBehalf, poolTokenAddress, amount, balanceOnPool, balanceInP2P];

    handleSupplied(supply);

    const user = User.load(user1.toHexString());
    assert.assertNotNull(user);
    assert.stringEquals(user!.address.toHexString(), user1.toHexString());
  });
});
