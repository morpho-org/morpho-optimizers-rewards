import { AgeConfig } from "../ages.types";

export type AgeDistribution = Omit<AgeConfig, "epochs" | "distribution">;
