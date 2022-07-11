import { BigInt } from "@graphprotocol/graph-ts";

export const getSupplyEmissions = (): Map<string, BigInt> => {
  const supplyEmissionsEpoch1 = new Map<string, BigInt>();
  supplyEmissionsEpoch1.set("0x35a18000230da775cac24873d00ff85bccded550", BigInt.fromString("252003228310040"));
  supplyEmissionsEpoch1.set("0x39aa39c021dfbae8fac545936693ac917d5e7563", BigInt.fromString("9785629915042802"));
  supplyEmissionsEpoch1.set("0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", BigInt.fromString("2135803619924775"));
  supplyEmissionsEpoch1.set("0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", BigInt.fromString("6313497077774288"));
  supplyEmissionsEpoch1.set("0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", BigInt.fromString("440637185066629"));
  supplyEmissionsEpoch1.set("0x7713dd9ca933848f6819f38b8352d9a15ea73f67", BigInt.fromString("16768348119381"));
  supplyEmissionsEpoch1.set("0xccf4429db6322d5c611ee964527d42e5d685dd6a", BigInt.fromString("7181356804008703"));
  supplyEmissionsEpoch1.set("0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", BigInt.fromString("6938163094383159"));
  return supplyEmissionsEpoch1;
};

export const getBorrowEmissions = (): Map<string, BigInt> => {
  const borrowEmissionsEpoch1 = new Map<string, BigInt>();
  borrowEmissionsEpoch1.set("0x35a18000230da775cac24873d00ff85bccded550", BigInt.fromString("648008301368675"));
  borrowEmissionsEpoch1.set("0x39aa39c021dfbae8fac545936693ac917d5e7563", BigInt.fromString("19574195812658375"));
  borrowEmissionsEpoch1.set("0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", BigInt.fromString("24561741629134920"));
  borrowEmissionsEpoch1.set("0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", BigInt.fromString("12628888394095763"));
  borrowEmissionsEpoch1.set("0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", BigInt.fromString("458622376293839"));
  borrowEmissionsEpoch1.set("0x7713dd9ca933848f6819f38b8352d9a15ea73f67", BigInt.fromString("33541727246298"));
  borrowEmissionsEpoch1.set("0xccf4429db6322d5c611ee964527d42e5d685dd6a", BigInt.fromString("14364868230520859"));
  borrowEmissionsEpoch1.set("0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", BigInt.fromString("10407244641574739"));
  return borrowEmissionsEpoch1;
};
