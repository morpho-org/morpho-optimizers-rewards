import { getMarketsRates } from "./getMarketsEmission";

const main = async (address?: string) => {
  const { marketsRates: marketsRatesBN } = await getMarketsRates();

  const marketsRates: { [market: string]: { supply: string; borrow: string } } = {};
  Object.keys(marketsRatesBN).map(
    (marketAddress) =>
      (marketsRates[marketAddress] = {
        supply: marketsRatesBN[marketAddress].supply.toString(),
        borrow: marketsRatesBN[marketAddress].borrow.toString(),
      })
  );

  //const unclaimedRewards = getUserUnclaimedTokensFromDistribution(usersDistribution, address);

  return { marketsRates };
};

main()
  .then(console.log)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
