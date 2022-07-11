import { BigInt } from "@graphprotocol/graph-ts";

export const WAD = BigInt.fromI32(10).pow(18);

export const initialIndex = BigInt.zero();

export const supplyEmissionsEpoch1 = new Map<string, BigInt>();
supplyEmissionsEpoch1.set("0x35a18000230da775cac24873d00ff85bccded550", BigInt.fromString("251653938466809"));
supplyEmissionsEpoch1.set("0x39aa39c021dfbae8fac545936693ac917d5e7563", BigInt.fromString("9785403013365767"));
supplyEmissionsEpoch1.set("0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", BigInt.fromString("2135586247856311"));
supplyEmissionsEpoch1.set("0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", BigInt.fromString("6313173901800069"));
supplyEmissionsEpoch1.set("0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", BigInt.fromString("440477064438619"));
supplyEmissionsEpoch1.set("0x7713dd9ca933848f6819f38b8352d9a15ea73f67", BigInt.fromString("16534424340789"));
supplyEmissionsEpoch1.set("0xccf4429db6322d5c611ee964527d42e5d685dd6a", BigInt.fromString("7181231179691494"));
supplyEmissionsEpoch1.set("0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", BigInt.fromString("6937844453395079"));

export const borrowEmissionsEpoch1 = new Map<string, BigInt>();
borrowEmissionsEpoch1.set("0x35a18000230da775cac24873d00ff85bccded550", BigInt.fromString("647818745672114"));
borrowEmissionsEpoch1.set("0x39aa39c021dfbae8fac545936693ac917d5e7563", BigInt.fromString("19573782223112876"));
borrowEmissionsEpoch1.set("0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5", BigInt.fromString("24561556669755297"));
borrowEmissionsEpoch1.set("0x5d3a536e4d6dbd6114cc1ead35777bab948e3643", BigInt.fromString("12628662623007849"));
borrowEmissionsEpoch1.set("0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4", BigInt.fromString("458334242726672"));
borrowEmissionsEpoch1.set("0x7713dd9ca933848f6819f38b8352d9a15ea73f67", BigInt.fromString("33399537168393"));
borrowEmissionsEpoch1.set("0xccf4429db6322d5c611ee964527d42e5d685dd6a", BigInt.fromString("14364446490303882"));
borrowEmissionsEpoch1.set("0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9", BigInt.fromString("10407097368579435"));
