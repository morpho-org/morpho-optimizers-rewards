import { providers } from "ethers";
import { RewardsDistributor__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { numberOfEpochs } from "../ages/ages";
import { StorageService } from "./StorageService";

export const getCurrentOnChainDistribution = async (
  provider: providers.Provider,
  storageService: StorageService,
  blockTag: providers.BlockTag = "latest"
) => {
  const rewardsDisributor = RewardsDistributor__factory.connect(addresses.morphoDao.rewardsDistributor, provider);
  const root = await rewardsDisributor.currRoot({ blockTag });
  return rootToProof(root, storageService);
};

export const rootToProof = async (root: string, storageService: StorageService) => {
  for (let epoch = numberOfEpochs; epoch > 0; epoch--) {
    const proofs = await storageService.readProofs(epoch);
    if (proofs?.root.toLowerCase() === root.toLowerCase()) return proofs;
  }
  throw new Error(`No proof found for root ${root}`);
};
