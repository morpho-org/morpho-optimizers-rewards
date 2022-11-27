import { providers } from "ethers";
import { RewardsDistributor__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { numberOfEpochs } from "../ages/ages";
export const getCurrentOnChainDistribution = async (
  provider: providers.Provider,
  blockTag: providers.BlockTag = "latest"
) => {
  const rewardsDisributor = RewardsDistributor__factory.connect(addresses.morphoDao.rewardsDistributor, provider);
  const root = await rewardsDisributor.currRoot({ blockTag });
  return rootToProof(root);
};
export interface Proofs {
  epoch: string;
  root: string;
  proofs: {
    [address: string]:
      | {
          amount: string;
          proof: string[];
        }
      | undefined;
  };
}
export const getAllProofs = () => {
  const proofs: Proofs[] = [];
  for (let index = numberOfEpochs; index > 0; index--) {
    const filename = `proofs-${index}.json`;
    let lastProofRaw: any;
    try {
      lastProofRaw = require(`../../distribution/proofs/${filename}`);
    } catch (e: any) {
      if (e.code !== "MODULE_NOT_FOUND") throw Error(e);
    }

    if (lastProofRaw) proofs.push(lastProofRaw);
  }
  return proofs;
};

export const rootToProof = (root: string) => {
  let index = numberOfEpochs;
  let retrieved = false;
  let proof: Proofs | undefined;
  while (!retrieved && index > 0) {
    const filename = `proofs-${index}.json`;
    let lastProofRaw: any;
    try {
      lastProofRaw = require(`../../distribution/proofs/${filename}`);
    } catch (e: any) {
      if (e.code !== "MODULE_NOT_FOUND") throw Error(e);
    }

    if (lastProofRaw) {
      proof = lastProofRaw;
      if (proof!.root.toLowerCase() === root.toLowerCase()) {
        retrieved = true;
      }
    }
    index--;
  }
  if (!proof) throw Error(`No proof found for root ${root}`);
  return proof;
};
