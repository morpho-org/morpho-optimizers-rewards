import {
  Balance,
  MarketEmission,
  MultiplicatorPerMarkets,
  TransactionType,
  User,
  UserMultiplicators,
} from "../types";
import { BigNumber } from "ethers";

export const getMultiplicator = (
  balances: Balance[],
  underlyingBalanceKey: "underlyingSupplyBalance" | "underlyingBorrowBalance",
  finalTimestamp: BigNumber
) => {
  // The multiplicator is a number representing amount(t1) * (t2 - t1), where t1 & t2 are the instant of a an action
  let multiplicator = BigNumber.from(0);

  balances.slice(1).forEach((newBalance, index) => {
    const prevBalance = balances[index];

    multiplicator = multiplicator.add(
      prevBalance[underlyingBalanceKey].mul(newBalance.timestamp.sub(prevBalance.timestamp))
    );
  });

  const lastBalance = balances[balances.length - 1];
  if (lastBalance.timestamp.lt(finalTimestamp)) {
    // we take the delta time from last action until the end of the age
    multiplicator = multiplicator.add(
      lastBalance[underlyingBalanceKey].mul(finalTimestamp.sub(lastBalance.timestamp))
    );
  }

  return multiplicator;
};

export const computeUsersDistribution = (
  users: User[],
  marketsEmissions: {
    [p: string]: MarketEmission | undefined;
  },
  finalTimestamp: BigNumber
) => {
  // The number of multiple emitted by markets (for normalization)
  const totalMarketMultiplicator: MultiplicatorPerMarkets = {};

  // The number of multiple emitted by users
  const usersMultiplicators: UserMultiplicators = {};
  users.map(async (user) => {
    const balancesPerMarkets: { [key: string]: Balance[] } = {};
    user.balances.forEach((balance) => {
      if (!Array.isArray(balancesPerMarkets[balance.market]))
        balancesPerMarkets[balance.market] = [balance];
      else balancesPerMarkets[balance.market].push(balance);
    });
    const multiplicatorsPerMarkets: MultiplicatorPerMarkets = {};

    Object.keys(balancesPerMarkets).forEach((marketAddress) => {
      const balances = balancesPerMarkets[marketAddress];
      if (balances.length === 0) {
        // user has no positions into this specific market
        multiplicatorsPerMarkets[marketAddress] = {
          supply: BigNumber.from(0),
          borrow: BigNumber.from(0),
        };
        return;
      }

      // Supply
      const supplyBalances = balances
        .filter((b) => [TransactionType.Supply, TransactionType.Withdraw].includes(b.type))
        .sort((b1, b2) => (b1.timestamp.gt(b2.timestamp) ? 1 : -1)); // asc sorting
      if (supplyBalances.length === 0) {
        multiplicatorsPerMarkets[marketAddress] = {
          supply: BigNumber.from(0),
          borrow: BigNumber.from(0),
        };
      } else {
        const supplyMultiplicator = getMultiplicator(
          supplyBalances,
          "underlyingSupplyBalance",
          finalTimestamp
        );

        multiplicatorsPerMarkets[marketAddress] = {
          supply: supplyMultiplicator,
          borrow: BigNumber.from(0),
        };
        if (!totalMarketMultiplicator[marketAddress]?.supply)
          totalMarketMultiplicator[marketAddress] = {
            supply: supplyMultiplicator,
            borrow: BigNumber.from(0),
          };
        else
          totalMarketMultiplicator[marketAddress]!.supply =
            totalMarketMultiplicator[marketAddress]!.supply.add(supplyMultiplicator);
      }

      // Borrow
      const borrowBalances = balances
        .filter((b) => [TransactionType.Borrow, TransactionType.Repay].includes(b.type))
        .sort((b1, b2) => (b1.timestamp.gt(b2.timestamp) ? 1 : -1));
      if (borrowBalances.length === 0) {
        multiplicatorsPerMarkets[marketAddress]!.borrow = BigNumber.from(0);
      } else {
        const borrowMultiplicator = getMultiplicator(
          supplyBalances,
          "underlyingBorrowBalance",
          finalTimestamp
        );

        multiplicatorsPerMarkets[marketAddress]!.borrow = borrowMultiplicator;
        if (!totalMarketMultiplicator[marketAddress]?.borrow)
          totalMarketMultiplicator[marketAddress] = {
            supply: totalMarketMultiplicator[marketAddress]?.supply ?? BigNumber.from(0),
            borrow: borrowMultiplicator,
          };
        else
          totalMarketMultiplicator[marketAddress]!.borrow =
            totalMarketMultiplicator[marketAddress]!.borrow.add(borrowMultiplicator);
      }
    });

    usersMultiplicators[user.address] = multiplicatorsPerMarkets;
  });

  const usersDistribution: { [user: string]: string } = {};

  Object.keys(usersMultiplicators).forEach((userAddress) => {
    const userMultiplicators = usersMultiplicators[userAddress];
    if (!userMultiplicators) return;
    const totalUserEmission = Object.keys(userMultiplicators)
      .map((marketAddress) => {
        const multiplicators = userMultiplicators[marketAddress];
        const totalMultiplicator = totalMarketMultiplicator[marketAddress];
        const marketEmission = marketsEmissions[marketAddress];

        const supplyRewards = totalMultiplicator!.supply.eq(0)
          ? BigNumber.from(0)
          : multiplicators!.supply.mul(marketEmission!.supply).div(totalMultiplicator!.supply);
        const borrowRewards = totalMultiplicator!.borrow.eq(0)
          ? BigNumber.from(0)
          : multiplicators!.borrow.mul(marketEmission!.borrow).div(totalMultiplicator!.borrow);

        return supplyRewards.add(borrowRewards);
      })
      .reduce((a, b) => a.add(b), BigNumber.from(0));
    if (totalUserEmission.eq(0)) return;
    usersDistribution[userAddress] = totalUserEmission.toString();
  });

  return usersDistribution;
};
