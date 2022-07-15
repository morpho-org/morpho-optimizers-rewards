import { getUserUnclaimedTokensFromDistribution } from "../getUserUnclaimedTokens";
import { formatUnits } from "ethers/lib/utils";

getUserUnclaimedTokensFromDistribution(process.argv[2], "epoch1", process.argv[3] ? +process.argv[3] : undefined)
  .then((r) => console.log(formatUnits(r)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
