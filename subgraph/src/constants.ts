import { BigInt } from "@graphprotocol/graph-ts";

export const WAD = BigInt.fromI32(10).pow(18);

export const initialIndex = BigInt.zero();
// epoch 1 supply
export const supplyEmissionsAgeOneEpochOne = new Map<string, BigInt>();
supplyEmissionsAgeOneEpochOne.set("0x35a18000230da775cac24873d00ff85bccded550", BigInt.fromString("252003228310040"));
supplyEmissionsAgeOneEpochOne.set("0x39aa39c021dfbae8fac545936693ac917d5e7563", BigInt.fromString("9785629915042802"));
supplyEmissionsAgeOneEpochOne.set("0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", BigInt.fromString("2135803619924775"));
supplyEmissionsAgeOneEpochOne.set("0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", BigInt.fromString("6313497077774288"));
supplyEmissionsAgeOneEpochOne.set("0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", BigInt.fromString("440637185066629"));
supplyEmissionsAgeOneEpochOne.set("0x7713dd9ca933848f6819f38b8352d9a15ea73f67", BigInt.fromString("16768348119381"));
supplyEmissionsAgeOneEpochOne.set("0xccf4429db6322d5c611ee964527d42e5d685dd6a", BigInt.fromString("7181356804008703"));
supplyEmissionsAgeOneEpochOne.set("0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", BigInt.fromString("6938163094383159"));

// epoch 1 borrow
export const borrowEmissionsAgeOneEpochOne = new Map<string, BigInt>();
borrowEmissionsAgeOneEpochOne.set("0x35a18000230da775cac24873d00ff85bccded550", BigInt.fromString("648008301368675"));
borrowEmissionsAgeOneEpochOne.set("0x39aa39c021dfbae8fac545936693ac917d5e7563", BigInt.fromString("19574195812658375"));
borrowEmissionsAgeOneEpochOne.set("0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", BigInt.fromString("24561741629134920"));
borrowEmissionsAgeOneEpochOne.set("0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", BigInt.fromString("12628888394095763"));
borrowEmissionsAgeOneEpochOne.set("0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", BigInt.fromString("458622376293839"));
borrowEmissionsAgeOneEpochOne.set("0x7713dd9ca933848f6819f38b8352d9a15ea73f67", BigInt.fromString("33541727246298"));
borrowEmissionsAgeOneEpochOne.set("0xccf4429db6322d5c611ee964527d42e5d685dd6a", BigInt.fromString("14364868230520859"));
borrowEmissionsAgeOneEpochOne.set("0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", BigInt.fromString("10407244641574739"));

// epoch 2 supply
export const supplyEmissionsAgeOneEpochTwo = new Map<string, BigInt>();
supplyEmissionsAgeOneEpochTwo.set("0x35a18000230da775cac24873d00ff85bccded550", BigInt.fromString("1170535564271435"));
supplyEmissionsAgeOneEpochTwo.set("0x39aa39c021dfbae8fac545936693ac917d5e7563", BigInt.fromString("53273332128376116"));
supplyEmissionsAgeOneEpochTwo.set("0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", BigInt.fromString("7262487903301427"));
supplyEmissionsAgeOneEpochTwo.set("0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", BigInt.fromString("43574258127452735"));
supplyEmissionsAgeOneEpochTwo.set("0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", BigInt.fromString("4417021155204518"));
supplyEmissionsAgeOneEpochTwo.set("0x7713dd9ca933848f6819f38b8352d9a15ea73f67", BigInt.fromString("185568069642867"));
supplyEmissionsAgeOneEpochTwo.set("0xccf4429db6322d5c611ee964527d42e5d685dd6a", BigInt.fromString("20856868369213946"));
supplyEmissionsAgeOneEpochTwo.set("0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", BigInt.fromString("50752333410381864"));

// epoch 2 borrow
export const borrowEmissionsAgeOneEpochTwo = new Map<string, BigInt>();
borrowEmissionsAgeOneEpochTwo.set("0x35a18000230da775cac24873d00ff85bccded550", BigInt.fromString("4208763903887734"));
borrowEmissionsAgeOneEpochTwo.set(
  "0x39aa39c021dfbae8fac545936693ac917d5e7563",
  BigInt.fromString("123245329662134540")
);
borrowEmissionsAgeOneEpochTwo.set("0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", BigInt.fromString("83518610887966413"));
borrowEmissionsAgeOneEpochTwo.set("0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", BigInt.fromString("87161589839702185"));
borrowEmissionsAgeOneEpochTwo.set("0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", BigInt.fromString("2542205495503719"));
borrowEmissionsAgeOneEpochTwo.set("0x7713dd9ca933848f6819f38b8352d9a15ea73f67", BigInt.fromString("185568069642867"));
borrowEmissionsAgeOneEpochTwo.set("0xccf4429db6322d5c611ee964527d42e5d685dd6a", BigInt.fromString("41719994424707285"));
borrowEmissionsAgeOneEpochTwo.set("0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", BigInt.fromString("54630418687587123"));

// epoch 3 supply
export const supplyEmissionsAgeOneEpochThree = new Map<string, BigInt>();
supplyEmissionsAgeOneEpochThree.set(
  "0x35a18000230da775cac24873d00ff85bccded550",
  BigInt.fromString("3396947613139741")
);
supplyEmissionsAgeOneEpochThree.set(
  "0x39aa39c021dfbae8fac545936693ac917d5e7563",
  BigInt.fromString("85816641405316611")
);
supplyEmissionsAgeOneEpochThree.set(
  "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5",
  BigInt.fromString("15405832570580501")
);
supplyEmissionsAgeOneEpochThree.set(
  "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643",
  BigInt.fromString("78346946985523116")
);
supplyEmissionsAgeOneEpochThree.set(
  "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4",
  BigInt.fromString("7312282725587365")
);
supplyEmissionsAgeOneEpochThree.set("0x7713dd9ca933848f6819f38b8352d9a15ea73f67", BigInt.fromString("251323011482380"));
supplyEmissionsAgeOneEpochThree.set(
  "0xccf4429db6322d5c611ee964527d42e5d685dd6a",
  BigInt.fromString("32641726328254251")
);
supplyEmissionsAgeOneEpochThree.set(
  "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9",
  BigInt.fromString("69254489643924614")
);

// epoch3 borrow
export const borrowEmissionsAgeOneEpochThree = new Map<string, BigInt>();
borrowEmissionsAgeOneEpochThree.set(
  "0x35a18000230da775cac24873d00ff85bccded550",
  BigInt.fromString("7862408081721847")
);
borrowEmissionsAgeOneEpochThree.set(
  "0x39aa39c021dfbae8fac545936693ac917d5e7563",
  BigInt.fromString("198532733695136045")
);
borrowEmissionsAgeOneEpochThree.set(
  "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5",
  BigInt.fromString("177167074561675766")
);
borrowEmissionsAgeOneEpochThree.set(
  "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643",
  BigInt.fromString("156717400405785364")
);
borrowEmissionsAgeOneEpochThree.set(
  "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4",
  BigInt.fromString("5062539961140279")
);
borrowEmissionsAgeOneEpochThree.set("0x7713dd9ca933848f6819f38b8352d9a15ea73f67", BigInt.fromString("251323011482380"));
borrowEmissionsAgeOneEpochThree.set(
  "0xccf4429db6322d5c611ee964527d42e5d685dd6a",
  BigInt.fromString("65293246153756703")
);
borrowEmissionsAgeOneEpochThree.set(
  "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9",
  BigInt.fromString("74546360945619850")
);

export const emissions = new Map<string, Map<string, BigInt>>();
emissions.set("ageOne-epochOne-Supply", supplyEmissionsAgeOneEpochOne);
emissions.set("ageOne-epochOne-Borrow", borrowEmissionsAgeOneEpochOne);
emissions.set("ageOne-epochTwo-Supply", supplyEmissionsAgeOneEpochTwo);
emissions.set("ageOne-epochTwo-Borrow", borrowEmissionsAgeOneEpochTwo);
emissions.set("ageOne-epochThree-Supply", supplyEmissionsAgeOneEpochThree);
emissions.set("ageOne-epochThree-Borrow", borrowEmissionsAgeOneEpochThree);
