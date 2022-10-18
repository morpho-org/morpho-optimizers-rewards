import { providers } from "ethers";
import { RewardsDistributor__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { getNumberOfEpochs } from "../utils/epochs";
export const getCurrentDistribution = async (provider: providers.Provider, blockTag: providers.BlockTag = "latest") => {
  const rewardsDisributor = RewardsDistributor__factory.connect(addresses.morphoDao.rewardsDistributor, provider);
  const root = await rewardsDisributor.currRoot({ blockTag });
  return rootToProof(root);
};

export const rootToProof = (root: string) => {
  let index = getNumberOfEpochs();
  let retrieved = false;
  let proof:
    | {
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
    | undefined;
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
