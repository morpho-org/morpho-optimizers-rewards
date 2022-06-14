import {
  Balance,
  MarketEmission,
  MultiplicatorPerMarkets,
  TransactionType,
  User,
  UserMultiplicators,
} from "../types";
import { BigNumber } from "ethers";

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
        .filter((b) =>
          [TransactionType.Supply, TransactionType.Withdraw].includes(b.type)
        )
        .sort((b1, b2) => (b1.timestamp.gt(b2.timestamp) ? 1 : -1)); // asc sorting
      if (supplyBalances.length === 0) {
        multiplicatorsPerMarkets[marketAddress] = {
          supply: BigNumber.from(0),
          borrow: BigNumber.from(0),
        };
      } else {
        // The multiplicator is a number representing supply(t1) * (t2 - t1), where t1 & t2 are the instant of a supply/withdraw action
        let supplyMultiplicator = BigNumber.from(0);

        supplyBalances.slice(1).forEach((newBalance, index) => {
          const prevBalance = supplyBalances[index];
          supplyMultiplicator = supplyMultiplicator.add(
            prevBalance.underlyingSupplyBalance.mul(
              newBalance.timestamp.sub(prevBalance.timestamp)
            )
          );
        });
        const lastBalance = supplyBalances[supplyBalances.length - 1];
        if (lastBalance.timestamp.lt(finalTimestamp)) {
          // we take the delta time from last action until the the end of the age
          supplyMultiplicator = supplyMultiplicator.add(
            lastBalance.underlyingSupplyBalance.mul(
              finalTimestamp.sub(lastBalance.timestamp)
            )
          );
        }
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
            totalMarketMultiplicator[marketAddress]!.supply.add(
              supplyMultiplicator
            );
      }
      // Borrow
      const borrowBalances = balances
        .filter((b) =>
          [TransactionType.Borrow, TransactionType.Repay].includes(b.type)
        )
        .sort((b1, b2) => (b1.timestamp.gt(b2.timestamp) ? 1 : -1));
      if (borrowBalances.length === 0) {
        multiplicatorsPerMarkets[marketAddress]!.borrow = BigNumber.from(0);
      } else {
        // The multiplicator is a number representing borrow(t1) * (t2 - t1), where t1 & t2 are the instant of a borrow/repay action
        let borrowMultiplicator = BigNumber.from(0);

        borrowBalances.slice(1).forEach((newBalance, index) => {
          const prevBalance = borrowBalances[index];
          borrowMultiplicator = borrowMultiplicator.add(
            prevBalance.underlyingBorrowBalance.mul(
              newBalance.timestamp.sub(prevBalance.timestamp)
            )
          );
        });
        const lastBalance = borrowBalances[borrowBalances.length - 1];
        if (lastBalance.timestamp.lt(finalTimestamp)) {
          // we take the delta time from last action until the the end of the age
          borrowMultiplicator = borrowMultiplicator.add(
            lastBalance.underlyingBorrowBalance.mul(
              finalTimestamp.sub(lastBalance.timestamp)
            )
          );
        }
        multiplicatorsPerMarkets[marketAddress]!.borrow = borrowMultiplicator;
        if (!totalMarketMultiplicator[marketAddress]?.borrow)
          totalMarketMultiplicator[marketAddress] = {
            supply:
              totalMarketMultiplicator[marketAddress]?.supply ??
              BigNumber.from(0),
            borrow: borrowMultiplicator,
          };
        else
          totalMarketMultiplicator[marketAddress]!.borrow =
            totalMarketMultiplicator[marketAddress]!.borrow.add(
              borrowMultiplicator
            );
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
          : multiplicators!.supply
              .mul(marketEmission!.supply)
              .div(totalMultiplicator!.supply);
        const borrowRewards = totalMultiplicator!.borrow.eq(0)
          ? BigNumber.from(0)
          : multiplicators!.borrow
              .mul(marketEmission!.borrow)
              .div(totalMultiplicator!.borrow);

        return supplyRewards.add(borrowRewards);
      })
      .reduce((a, b) => a.add(b), BigNumber.from(0));
    if (totalUserEmission.eq(0)) return;
    usersDistribution[userAddress] = totalUserEmission.toString();
  });
  return usersDistribution;
};
