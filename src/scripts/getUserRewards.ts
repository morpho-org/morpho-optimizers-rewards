/* eslint-disable no-console */
import * as dotenv from "dotenv";

dotenv.config();
import { getUserRewards } from "../utils";
import { formatUnits } from "ethers/lib/utils";
import { providers } from "ethers";
import { mapValues } from "lodash";

const provider = process.env.RPC_URL
  ? new providers.JsonRpcProvider(process.env.RPC_URL)
  : new providers.InfuraProvider(1);

getUserRewards(process.argv[2], process.argv[3] ? +process.argv[3] : undefined, provider)
  .then((r) =>
    console.log({
      currentEpochRewards: formatUnits(r.currentEpochRewards),
      currentEpochProjectedRewards: formatUnits(r.currentEpochProjectedRewards),
      totalRewardsEarned: formatUnits(r.totalRewardsEarned),
      claimedRewards: formatUnits(r.claimedRewards),
      claimable: formatUnits(r.claimable),
      claimableSoon: formatUnits(r.claimableSoon),
      claimData: r.claimData,
      markets: mapValues(r.markets, ({ accumulatedSupply, accumulatedBorrow }) => ({
        accumulatedSupply: formatUnits(accumulatedSupply),
        accumulatedBorrow: formatUnits(accumulatedBorrow),
      })),
    })
  )
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
