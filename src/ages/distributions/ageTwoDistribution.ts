import { Epoch2Config } from "../ages";
import { ageOneDistribution } from "./ageOneDistribution";

export const ageTwoDistribution = async (epochConfig: Epoch2Config) => {
  return ageOneDistribution(epochConfig);
};
