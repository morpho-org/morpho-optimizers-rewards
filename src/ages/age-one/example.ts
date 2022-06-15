import { getMarketsRates } from "./getMarketsEmission";
import { getUserUnclaimedTokensFromDistribution } from "./getUserUnclaimedTokens";

const main = async (address: string) => {
  const { marketsRates: marketsRatesBN, usersDistribution } = await getMarketsRates();

  const marketsRates: {[market: string]: {supply: string, borrow: string}} = {};
  Object.keys(marketsRatesBN).map(marketAddress => marketsRates[marketAddress] = {
      supply: marketsRatesBN[marketAddress].supply.toString(),
      borrow: marketsRatesBN[marketAddress].borrow.toString(),
  });

  const unclaimedRewards = getUserUnclaimedTokensFromDistribution(usersDistribution, address);

  return {marketsRates, unclaimedRewards};
};

main("0x6e632701fd42a9b856294a2172dd63f03eb957c5")
  .then(console.log)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
