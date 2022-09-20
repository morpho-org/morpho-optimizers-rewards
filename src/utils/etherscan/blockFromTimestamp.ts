import { BigNumber, BigNumberish } from "ethers";
import axios from "axios";

export const blockFromTimestamp = async (timestamp: BigNumberish, closest: "before" | "after", apiKey: string) =>
  axios
    .get(
      `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${BigNumber.from(
        timestamp
      ).toString()}&closest=${closest}&apikey=${apiKey}`
    )
    .then((r) => r.data.result as string);
