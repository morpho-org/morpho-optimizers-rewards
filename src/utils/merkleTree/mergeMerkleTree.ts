import { computeMerkleTree, Tree } from "./merkleTree";
import { BigNumber, constants } from "ethers";

export const mergeMerkleTrees = (merkleTrees: Tree[]) => {
  const userDistribution: Record<string, BigNumber> = {};
  merkleTrees.forEach((merkleTree) =>
    Object.entries(merkleTree.proofs).forEach(([user, { amount }]) => {
      userDistribution[user] = (userDistribution[user] || constants.Zero).add(BigNumber.from(amount));
    })
  );
  const distributions = Object.entries(userDistribution).map(([user, amount]) => ({
    address: user,
    accumulatedRewards: amount.toString(),
  }));
  return computeMerkleTree(distributions);
};
