import { BigNumber, ethers, providers } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { fetchUsers } from "../subgraph/fetch";
import {
  Balance,
  Market,
  MultiplicatorPerMarkets,
  TransactionType,
  UserMultiplicators,
} from "../types";
import * as fs from "fs";
import path from "path";
import { MerkleTree } from "merkletreejs";
import { getMarketsConfiguration } from "../markets";

const BASE_UNITS = BigNumber.from(10_000);

export const ageOneSettings = {
  initialBlock: 14911330,
  initialTimestamp: BigNumber.from(10),
  finalTimestamp: BigNumber.from(100),
  totalEmission: BigNumber.from(5_000_000),
  subgraphUrl: "https://api.thegraph.com/subgraphs/name/morpho-labs/morphoages",
};

const main = async () => {
  const provider = new providers.JsonRpcProvider(process.env.RPC_URL, 1);
  const initialBlock = await provider.getBlock(ageOneSettings.initialBlock);
  ageOneSettings.initialTimestamp = BigNumber.from(initialBlock.timestamp);
  const currentBlock = await provider.getBlock("latest");
  ageOneSettings.finalTimestamp = BigNumber.from(currentBlock.timestamp);
  const ageOneMarketsParameters = await getMarketsConfiguration(
    ageOneSettings.initialBlock
  );
  console.log("Markets parameters");

  const totalSupplyUSD = Object.values(ageOneMarketsParameters)
    .map((market) => market.totalSupply.mul(market.price).div(parseUnits("1")))
    .reduce((a, b) => a.add(b), BigNumber.from(0));

  const totalBorrowUSD = Object.values(ageOneMarketsParameters)
    .map((market) => market.totalBorrow.mul(market.price).div(parseUnits("1")))
    .reduce((a, b) => a.add(b), BigNumber.from(0));

  const total = totalBorrowUSD.add(totalSupplyUSD);

  const marketsEmissions: {
    [market: string]: { supply: BigNumber; borrow: BigNumber } | undefined;
  } = {};
  Object.keys(ageOneMarketsParameters).forEach((marketAddress) => {
    const market: Market = ageOneMarketsParameters[marketAddress];
    // total market value at the beginning of the age
    const totalMarketUSD = market.totalBorrow
      .add(market.totalSupply)
      .mul(market.price)
      .div(parseUnits("1"));
    const marketEmission = totalMarketUSD
      .mul(ageOneSettings.totalEmission)
      .div(total);
    marketsEmissions[marketAddress] = {
      supply: marketEmission.mul(market.p2pIndexCursor).div(BASE_UNITS),
      borrow: marketEmission
        .mul(BASE_UNITS.sub(market.p2pIndexCursor))
        .div(BASE_UNITS),
    };
  });

  console.log("Markets Emissions", JSON.stringify(marketsEmissions, null, 2));

  const formattedMarketsEmission: {
    [market: string]: { supply: string; borrow: string };
  } = {};
  Object.keys(marketsEmissions).forEach((m) => {
    const marketEmission = marketsEmissions[m];
    if (!marketEmission) return;
    formattedMarketsEmission[m] = {
      supply: marketEmission.supply.toString(),
      borrow: marketEmission.borrow.toString(),
    };
  });

  // save the age into a file
  const ageOneMarketsFilename = "./ages/age1/marketsEmission.json";
  const ageMarketsPath = path.dirname(ageOneMarketsFilename);
  await fs.promises.mkdir(ageMarketsPath, { recursive: true });
  await fs.promises.writeFile(
    ageOneMarketsFilename,
    JSON.stringify(
      {
        totalEmission: ageOneSettings.totalEmission.toString(),
        markets: formattedMarketsEmission,
      },
      null,
      2
    )
  );
  /// user related ///

  const users = await fetchUsers(
    ageOneSettings.subgraphUrl,
    ageOneSettings.initialBlock,
    Object.keys(marketsEmissions),
    ageOneSettings.initialTimestamp.toNumber(),
    ageOneSettings.finalTimestamp.toNumber()
  );

  const totalMarketMultiplicator: {
    [market: string]: { supply: BigNumber; borrow: BigNumber } | undefined;
  } = {};
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
        if (lastBalance.timestamp.lt(ageOneSettings.finalTimestamp)) {
          console.log(lastBalance);
          // we take the delta time from last action until the the end of the age
          supplyMultiplicator = supplyMultiplicator.add(
            lastBalance.underlyingSupplyBalance.mul(
              ageOneSettings.finalTimestamp.sub(lastBalance.timestamp)
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
        multiplicatorsPerMarkets[marketAddress].borrow = BigNumber.from(0);
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
        if (lastBalance.timestamp.lt(ageOneSettings.finalTimestamp)) {
          // we take the delta time from last action until the the end of the age
          borrowMultiplicator = borrowMultiplicator.add(
            lastBalance.underlyingBorrowBalance.mul(
              ageOneSettings.finalTimestamp.sub(lastBalance.timestamp)
            )
          );
        }
        multiplicatorsPerMarkets[marketAddress].borrow = borrowMultiplicator;
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
          : multiplicators.supply
              .mul(marketEmission!.supply)
              .div(totalMultiplicator!.supply);
        const borrowRewards = totalMultiplicator!.borrow.eq(0)
          ? BigNumber.from(0)
          : multiplicators.borrow
              .mul(marketEmission!.borrow)
              .div(totalMultiplicator!.borrow);

        return supplyRewards.add(borrowRewards);
      })
      .reduce((a, b) => a.add(b), BigNumber.from(0));
    if (totalUserEmission.eq(0)) return;
    usersDistribution[userAddress] = totalUserEmission.toString();
  });

  // save the age into a file
  const ageOneFilename = "./ages/age1/distribution.json";
  const agePath = path.dirname(ageOneFilename);
  await fs.promises.mkdir(agePath, { recursive: true });
  await fs.promises.writeFile(
    ageOneFilename,
    JSON.stringify(usersDistribution, null, 2)
  );

  const leaves = Object.keys(usersDistribution).map((userAddr) =>
    ethers.utils.solidityKeccak256(
      ["address", "uint256"],
      [userAddr, usersDistribution[userAddr]]
    )
  );
  const merkleTree = new MerkleTree(leaves, ethers.utils.keccak256, {
    sortPairs: true,
  });

  const proofs: { [user: string]: { amount: string; proof: string[] } } = {};
  Object.keys(usersDistribution).forEach((userAddr) => {
    proofs[userAddr] = {
      amount: usersDistribution[userAddr],
      proof: merkleTree.getHexProof(
        ethers.utils.solidityKeccak256(
          ["address", "uint256"],
          [userAddr, usersDistribution[userAddr]]
        )
      ),
    };
  });
  const root = merkleTree.getRoot();
  // save the age proofs into a file
  const ageOneProofsFilename = "./ages/age1/proofs.json";
  const ageProofsPath = path.dirname(ageOneProofsFilename);
  await fs.promises.mkdir(ageProofsPath, { recursive: true });
  await fs.promises.writeFile(
    ageOneProofsFilename,
    JSON.stringify(
      {
        root,
        proofs,
      },
      null,
      2
    )
  );
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
