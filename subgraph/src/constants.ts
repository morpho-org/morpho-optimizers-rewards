import { BigInt } from "@graphprotocol/graph-ts";

export const WAD = BigInt.fromI32(10).pow(18);

export const initialIndex = BigInt.zero();

export const supplyEmissionsCurrentEpoch = new Map<string, BigInt>();
supplyEmissionsCurrentEpoch.set("0x35a18000230da775cac24873d00ff85bccded550", BigInt.fromString("252003228310040"));
supplyEmissionsCurrentEpoch.set("0x39aa39c021dfbae8fac545936693ac917d5e7563", BigInt.fromString("9785629915042802"));
supplyEmissionsCurrentEpoch.set("0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", BigInt.fromString("2135803619924775"));
supplyEmissionsCurrentEpoch.set("0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", BigInt.fromString("6313497077774288"));
supplyEmissionsCurrentEpoch.set("0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", BigInt.fromString("440637185066629"));
supplyEmissionsCurrentEpoch.set("0x7713dd9ca933848f6819f38b8352d9a15ea73f67", BigInt.fromString("16768348119381"));
supplyEmissionsCurrentEpoch.set("0xccf4429db6322d5c611ee964527d42e5d685dd6a", BigInt.fromString("7181356804008703"));
supplyEmissionsCurrentEpoch.set("0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", BigInt.fromString("6938163094383159"));

export const borrowEmissionsCurrentEpoch = new Map<string, BigInt>();
borrowEmissionsCurrentEpoch.set("0x35a18000230da775cac24873d00ff85bccded550", BigInt.fromString("648008301368675"));
borrowEmissionsCurrentEpoch.set("0x39aa39c021dfbae8fac545936693ac917d5e7563", BigInt.fromString("19574195812658375"));
borrowEmissionsCurrentEpoch.set("0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", BigInt.fromString("24561741629134920"));
borrowEmissionsCurrentEpoch.set("0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", BigInt.fromString("12628888394095763"));
borrowEmissionsCurrentEpoch.set("0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", BigInt.fromString("458622376293839"));
borrowEmissionsCurrentEpoch.set("0x7713dd9ca933848f6819f38b8352d9a15ea73f67", BigInt.fromString("33541727246298"));
borrowEmissionsCurrentEpoch.set("0xccf4429db6322d5c611ee964527d42e5d685dd6a", BigInt.fromString("14364868230520859"));
borrowEmissionsCurrentEpoch.set("0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", BigInt.fromString("10407244641574739"));
