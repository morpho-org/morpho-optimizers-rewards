import { MarketDistributor, parseDate } from "./MarketDistributor";
import { BlockTimestamp, IRatesProvider, isDefined } from "./Distributor";

export class RatesProvider implements IRatesProvider {
  #marketDistributor: MarketDistributor;
  #marketsEmissions: Awaited<ReturnType<MarketDistributor["distribute"]>> | null = null;
  #configBlocks: Record<
    any,
    {
      initialBlock: number;
      finalBlock: number;
    }
  > = {};

  constructor(_marketDistributor: MarketDistributor) {
    this.#marketDistributor = _marketDistributor;
  }

  async init() {
    this.#marketsEmissions = await this.#marketDistributor.distribute();

    // fetch all block numbers for all needed timestamps
    this.#configBlocks = await this.#marketDistributor.fetchConfigTimestampsBlocks();
  }

  getRangeRates(marketSide: string, from: BlockTimestamp, to: BlockTimestamp) {
    if (!this.#marketsEmissions) throw new Error("Rates provider not initialized");
    const isSupplySide = marketSide.includes("-Supply");
    const marketAddress = marketSide.replace("-Supply", "").replace("-Borrow", "").toLowerCase();
    const configurations = this.#marketDistributor.configFetcher.getAllConfigurations();

    return Object.entries(this.#marketsEmissions)
      .map(([id, { marketsEmissions }]) => {
        const block = this.#configBlocks[id];

        // find an overlap between the requested range and the market emission range
        const overlap = {
          from: Math.max(from.block, block.initialBlock),
          to: Math.min(to.block, block.finalBlock),
        };
        if (overlap.from > overlap.to) return undefined;

        const marketEmission = marketsEmissions[marketAddress];

        if (!marketEmission) return undefined;

        const config = configurations.find((c) => c.id === id);
        if (!config) throw new Error(`No config found for ${id}`);

        const rate = isSupplySide
          ? marketEmission.morphoRatePerSecondSupplySide
          : marketEmission.morphoRatePerSecondBorrowSide;

        return {
          from: {
            block: block.initialBlock,
            timestamp: parseDate(config.initialTimestamp),
          },
          to: {
            block: block.finalBlock,
            timestamp: parseDate(config.finalTimestamp),
          },
          rate,
        };
      })
      .filter(isDefined);
  }
}
