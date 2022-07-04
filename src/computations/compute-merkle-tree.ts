import { ethers } from "ethers";
import { MerkleTree } from "merkletreejs";

export const computeMerkleTree = (distribution: { address: string; unclaimedRewards: string }[]) => {
  const leaves = distribution.map(
    ({ address, unclaimedRewards }) =>
      ethers.utils.solidityKeccak256(["address", "uint256"], [address, unclaimedRewards]), // 18 * 2 decimals
  );
  const merkleTree = new MerkleTree(leaves, ethers.utils.keccak256, {
    sortPairs: true,
  });

  const proofs: { [user: string]: { amount: string; proof: string[] } } = {};
  distribution.forEach(({ address, unclaimedRewards }) => {
    proofs[address] = {
      amount: unclaimedRewards,
      proof: merkleTree.getHexProof(
        ethers.utils.solidityKeccak256(["address", "uint256"], [address, unclaimedRewards]),
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
