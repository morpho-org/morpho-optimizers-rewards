import { BigNumber, BigNumberish } from "ethers";

import { wait } from "../../helpers";

/**
 * Get the block number from a timestamp
 * @throws if no Etherscan API key is provided
 * @throws If the timestamp is too far in the future
 *
 * @param timestamp in seconds
 * @param closest "before" or "after"
 * @param apiKey Etherscan API key
 */
export const blockFromTimestamp = async (
  timestamp: BigNumberish,
  closest: "before" | "after",
  apiKey = process.env.ETHERSCAN_API_KEY
) => {
  if (!apiKey) throw new Error("No Etherscan API key provided");
  const fromTS = BigNumber.from(timestamp).toString();
  const response = await fetch(
    `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${fromTS}&closest=${closest}&apikey=${apiKey}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  )
    .then((r) => r.json())
    .then((r) => r.result as string);
  if (response.includes("Error")) throw new Error(`No snapshot block yet for timestamp ${timestamp}`);
  return response;
};

const cache = new Map<string, number>([
  ["1657731600-before", 15135480],
  ["1663686000-before", 15575441],
  ["1654707606-after", 14927832],
  ["1657731606-after", 15135481],
  ["1672326000-before", 16291169],
  ["1692540000-after", 17956412],
  ["1696428000-after", 18277612],
  ["1669561200-after", 16062078],
  ["1675263600-before", 16534719],
  ["1669561200-before", 16062077],
  ["1663686000-after", 15575442],
  ["1660669200-before", 15353545],
  ["1672326000-after", 16291170],
  ["1672322400-after", 16290872],
  ["1669557600-after", 16061781],
  ["1677938400-after", 16755531],
  ["1684767600-after", 17315581],
  ["1666623600-before", 15818711],
  ["1721568480-after", 20355211],
  ["1688655600-before", 17635552],
  ["1680879600-after", 16997355],
  ["1704895439-before", 18977023],
  ["1675263600-after", 16534720],
  ["1660669206-after", 15353547],
  ["1710082679-before", 19405438],
  ["1721572080-after", 20355508],
  ["1677942000-after", 16755828],
  ["1700319600-after", 18599477],
  ["1688655600-after", 17635553],
  ["1692543600-before", 17956709],
  ["1684767600-before", 17315580],
  ["1688652000-after", 17635255],
  ["1666623600-after", 15818712],
  ["1692543600-after", 17956710],
  ["1680876000-after", 16997062],
  ["1684764000-after", 17315284],
  ["1680879600-before", 16997354],
  ["1675260000-after", 16534421],
  ["1696431600-after", 18277910],
  ["1700316000-after", 18599180],
  ["1710082679-after", 19405438],
  ["1714489079-after", 19768869],
  ["1721572080-before", 20355507],
  ["1704895439-after", 18977023],
  ["1696431600-before", 18277909],
  ["1700319600-before", 18599476],
  ["1677942000-before", 16755827],
  ["1714485479-after", 19768570],
  ["1710079079-after", 19405139],
  ["1704891839-after", 18976728],
  ["1714489079-before", 19768869],
]);

export const blockFromTimestampWithRetry = async (
  ts: number,
  direction: "before" | "after",
  apiKey = process.env.ETHERSCAN_API_KEY,
  retries = 0
): Promise<number> => {
  if (cache.has(`${ts}-${direction}`)) return Promise.resolve(cache.get(`${ts}-${direction}`)!);
  const res = await blockFromTimestamp(ts, direction, apiKey);
  const blockNumber = parseInt(res);
  if (isNaN(blockNumber)) {
    if (retries > 10) throw Error("Too many retries, aborting...");
    await wait(2000);
    return blockFromTimestampWithRetry(ts, direction, apiKey, retries + 1);
  }
  cache.set(`${ts}-${direction}`, blockNumber);
  return blockNumber;
};
