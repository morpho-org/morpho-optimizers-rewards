import { Wallet } from "ethers";
import { Multicall3__factory, RewardsDistributor__factory } from "@morpho-labs/morpho-ethers-contract";
import addresses from "@morpho-labs/morpho-ethers-contract/lib/addresses";
import { StorageService } from "./StorageService";
import { formatUnits } from "ethers/lib/utils";

/**
 * Claim rewards for multiple users using an EOA on Mainnet.
 * @notice Addresses are hardcoded to improve user address checking. (really encouraged)
 *
 * @param userAddresses A  list of user addresses to claim rewards for
 * @param storageService A storage service to read the proofs from
 * @param signer The signer to use to send the transaction
 */
export const claim = async (userAddresses: string[], storageService: StorageService, signer: Wallet) => {
  if ((await signer.provider.getNetwork()).chainId !== 1)
    throw new Error("Claiming rewards is only supported on mainnet");

  const rewardsDistributor = RewardsDistributor__factory.connect("0x3b14e5c73e0a56d607a8688098326fd4b4292135", signer);

  const [merkleRoot, allProofs] = await Promise.all([rewardsDistributor.currRoot(), storageService.readAllProofs()]);
  const epochConfig = allProofs.find((epochConfig) => epochConfig.root.toLowerCase() === merkleRoot.toLowerCase());

  if (!epochConfig) throw Error("No epoch config found for the current merkle root");
  console.log("Claiming rewards for epoch", epochConfig.epochNumber);

  const txs = await Promise.all(
    userAddresses
      .map((userAddress) => {
        const proof = epochConfig.proofs[userAddress.toLowerCase()];

        if (!proof) {
          console.warn(`No proof found for user ${userAddress}`);
          return;
        }

        return rewardsDistributor.populateTransaction.claim(userAddress, proof!.amount, proof.proof);
      })
      .filter(Boolean)
  );

  if (txs.length === 0) {
    console.warn("No proofs found");
    return;
  }

  if (txs.length === 1) {
    console.log(`Claiming rewards for ${userAddresses[0]}`);
    const txResp = await signer.sendTransaction(txs[0]!);

    console.log(`Check the transaction on etherscan: https://etherscan.io/tx/${txResp.hash}`);
    const txReceipt = await txResp.wait();
    console.log(`Transaction successful, ${formatUnits(txReceipt.gasUsed, "gwei")} gwei used`);
    return;
  }

  console.log(`Batching the claiming of rewards for ${txs.length} users`);

  const multicall = Multicall3__factory.connect("0xcA11bde05977b3631167028862bE2a173976CA11", signer);

  const batchedTx = await multicall.populateTransaction.aggregate(
    txs.map((tx) => ({ target: addresses.morphoDao.rewardsDistributor, callData: tx!.data! }))
  );

  const txResp = await signer.sendTransaction(batchedTx);

  console.log(`Check the multicall transaction on etherscan: https://etherscan.io/tx/${txResp.hash}`);
  const txReceipt = await txResp.wait();
  console.log(`Multicall transaction successful, ${formatUnits(txReceipt.gasUsed, "gwei")} gwei used`);
};
