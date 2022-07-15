import { getUserUnclaimedTokensFromDistribution } from "../getUserUnclaimedTokens";
import { formatUnits } from "ethers/lib/utils";
import configuration from "../configuration";

getUserUnclaimedTokensFromDistribution(
  process.argv[2],
  process.argv[3] as keyof typeof configuration.epochs,
  process.argv[4] ? +process.argv[4] : undefined,
)
  .then((r) => console.log(formatUnits(r)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
