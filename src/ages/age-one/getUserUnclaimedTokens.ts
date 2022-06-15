import { UsersDistribution } from "../../types";

export const getUserUnclaimedTokensFromDistribution = (
  usersDistribution: UsersDistribution,
  address: string
) => usersDistribution[address.toLowerCase()] ?? "0";
