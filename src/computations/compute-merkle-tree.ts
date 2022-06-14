import { ethers } from "ethers";
import { MerkleTree } from "merkletreejs";

export const computeMerkleTree = (usersDistribution: {
  [p: string]: string;
}) => {
  const leaves = Object.keys(usersDistribution).map((userAddr) =>
    ethers.utils.solidityKeccak256(
      ["address", "uint256"],
      [userAddr, usersDistribution[userAddr]]
    )
  );
  const merkleTree = new MerkleTree(leaves, ethers.utils.keccak256, {
    sortPairs: true,
  });

  const proofs: { [user: string]: { amount: string; proof: string[] } } = {};
  Object.keys(usersDistribution).forEach((userAddr) => {
    proofs[userAddr] = {
      amount: usersDistribution[userAddr],
      proof: merkleTree.getHexProof(
        ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [userAddr, usersDistribution[userAddr]]
        )
      ),
    };
  });
  const root = merkleTree.getRoot();

  return {
    root,
    proofs,
    leaves,
  };
};
