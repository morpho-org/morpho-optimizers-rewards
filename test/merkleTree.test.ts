import { computeMerkleTree } from "../src/utils";
import { mergeMerkleTrees } from "../src/utils/merkleTree/mergeMerkleTree";

describe("Merkle tree", () => {
  const user0 = "0x0000000000000000000000000000000000000000";
  const user1 = "0x0000000000000000000000000000000000000001";
  const user2 = "0x0000000000000000000000000000000000000002";

  const distribution1 = [
    {
      address: user0,
      accumulatedRewards: "100",
    },
    {
      address: user1,
      accumulatedRewards: "200",
    },
  ];

  it("Should return the correct merkle tree", async () => {
    const { proofs } = computeMerkleTree(distribution1);
    expect(proofs[user0].amount).toEqual("100");
    expect(proofs[user1].amount).toEqual("200");
  });

  it("Should sum the amounts correctly", async () => {
    const { total } = computeMerkleTree(distribution1);
    expect(total).toEqual("300");
  });

  it("Should merge two merkle tree correctly", async () => {
    const distribution2 = [
      {
        address: user0,
        accumulatedRewards: "100",
      },
      {
        address: user2,
        accumulatedRewards: "300",
      },
    ];
    const merkleTree1 = computeMerkleTree(distribution1);
    const merkleTree2 = computeMerkleTree(distribution2);
    const { proofs } = mergeMerkleTrees([merkleTree1, merkleTree2]);
    expect(proofs[user0].amount).toEqual("200");
    expect(proofs[user1].amount).toEqual("200");
    expect(proofs[user2].amount).toEqual("300");
  });
});
