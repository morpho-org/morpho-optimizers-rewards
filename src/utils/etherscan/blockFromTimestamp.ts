import { BigNumber, BigNumberish } from "ethers";

export const blockFromTimestamp = async (timestamp: BigNumberish, closest: "before" | "after", apiKey: string) =>
  fetch(
    `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${BigNumber.from(
      timestamp
    ).toString()}&closest=${closest}&apikey=${apiKey}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  )
    .then((r) => r.json())
    .then((r) => r.result as string);
