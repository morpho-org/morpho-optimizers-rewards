import {
  BlockTimestamp,
  DistributorV1,
  IEventFetcher,
  IndexesEvent,
  IRatesProvider,
  RangeRate,
  TxEvent,
} from "../../src/distributor/Distributor";
import { WadRayMath } from "@morpho-labs/ethers-utils/lib/maths";
import { constants, Wallet } from "ethers";
import * as fs from "fs";

describe("Test Distributor", () => {
  describe("Tests in one epoch", () => {
    const alice = Wallet.createRandom().address;
    const bob = Wallet.createRandom().address;
    const marketA = "0x0000000000000000000000000000000000000001";
    it("Should distribute rewards to one user", async () => {
      const oneMorphoPerSecond = WadRayMath.WAD;
      const ratesProvider: IRatesProvider = {
        getRangeRates(from: BlockTimestamp, to: BlockTimestamp): readonly RangeRate[] {
          return [
            { from: { block: 0, timestamp: 0 }, to: { block: 2, timestamp: 2 }, rate: constants.Zero },
            { from: { block: 2, timestamp: 2 }, to: { block: 100, timestamp: 100 }, rate: oneMorphoPerSecond },
          ];
        },
      };
      const eventsFetcher: IEventFetcher = {
        async getEvents(from: BlockTimestamp, to: BlockTimestamp) {
          return [
            {
              marketSide: marketA + "-Supply",
              indexOnPool: WadRayMath.WAD,
              indexInP2P: WadRayMath.WAD,
              indexPrecision: WadRayMath.WAD,
              block: { block: 1, timestamp: 1 },
              transactionIndex: 1,
              logIndex: 1,
            } as IndexesEvent,
            {
              block: { block: 2, timestamp: 2 },
              user: alice,
              onPool: WadRayMath.WAD,
              inP2P: WadRayMath.WAD,
              marketSide: marketA + "-Supply",
              transactionIndex: 1,
              logIndex: 1,
            } as TxEvent,
          ];
        },
      };

      const distributor = new DistributorV1(ratesProvider, eventsFetcher);
      await distributor.run({ block: 1, timestamp: 1 }, { block: 2, timestamp: 2 });
      // alice has supplied at block 2, so she should get 1 morpho for 1 second
      const users = distributor.getAllUpdatedUsers({ block: 3, timestamp: 3 });

      expect(users[alice]).not.toBeUndefined();
      expect(users[bob]).toBeUndefined();
      const bal = users[alice].balances[marketA + "-Supply"];
      expect(bal).not.toBeUndefined();

      expect(bal!.morphoAccrued).toBnEq(oneMorphoPerSecond);

      const { totalDistributed } = distributor.getDistributionSnapshot({ block: 3, timestamp: 3 });
      expect(totalDistributed).toBnEq(oneMorphoPerSecond);
    });
    it("Should distribute rewards to multiple users", async () => {
      const oneMorphoPerSecond = WadRayMath.WAD;
      const ratesProvider: IRatesProvider = {
        getRangeRates(from: BlockTimestamp, to: BlockTimestamp): readonly RangeRate[] {
          return [
            { from: { block: 0, timestamp: 0 }, to: { block: 2, timestamp: 2 }, rate: constants.Zero },
            { from: { block: 2, timestamp: 2 }, to: { block: 100, timestamp: 100 }, rate: oneMorphoPerSecond },
          ];
        },
      };
      const eventsFetcher: IEventFetcher = {
        async getEvents(from: BlockTimestamp, to: BlockTimestamp) {
          return [
            {
              marketSide: marketA + "-Supply",
              indexOnPool: WadRayMath.WAD,
              indexInP2P: WadRayMath.WAD,
              indexPrecision: WadRayMath.WAD,
              block: { block: 1, timestamp: 1 },
              transactionIndex: 1,
              logIndex: 1,
            } as IndexesEvent,
            {
              block: { block: 2, timestamp: 2 },
              user: alice,
              onPool: WadRayMath.WAD,
              inP2P: WadRayMath.WAD,
              marketSide: marketA + "-Supply",
              transactionIndex: 1,
              logIndex: 1,
            } as TxEvent,
            {
              block: { block: 3, timestamp: 3 },
              user: bob,
              onPool: WadRayMath.WAD,
              inP2P: WadRayMath.WAD,
              marketSide: marketA + "-Supply",
              transactionIndex: 1,
              logIndex: 1,
            } as TxEvent,
          ];
        },
      };

      const distributor = new DistributorV1(ratesProvider, eventsFetcher);
      await distributor.run({ block: 1, timestamp: 1 }, { block: 3, timestamp: 3 });
      // alice has supplied at block 2, so she should get 1 morpho for 1 second
      const users = distributor.getAllUpdatedUsers({ block: 4, timestamp: 4 });

      expect(users[alice]).not.toBeUndefined();
      expect(users[bob]).not.toBeUndefined();
      const aliceB = users[alice].balances[marketA + "-Supply"];
      expect(aliceB).not.toBeUndefined();

      await fs.promises.writeFile("users.json", JSON.stringify(users, null, 2));

      expect(aliceB!.morphoAccrued).toBnEq(oneMorphoPerSecond.add(oneMorphoPerSecond.div(2)));

      const bobB = users[bob].balances[marketA + "-Supply"];
      expect(bobB!.morphoAccrued).toBnEq(oneMorphoPerSecond.div(2));

      const { totalDistributed } = distributor.getDistributionSnapshot({ block: 4, timestamp: 4 });
      expect(totalDistributed).toBnEq(oneMorphoPerSecond.mul(2));
    });
  });
});
