import { Address } from "@graphprotocol/graph-ts";
import { User } from "../generated/schema";

export function getOrInitUser(userAddress: Address): User {
  let user = User.load(userAddress.toHexString());
  if (user === null) {
    user = new User(userAddress.toHexString());
    user.address = userAddress;
    user.save();
  }
  return user;
}
