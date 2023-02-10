import * as dotenv from "dotenv";
import { ethers } from "ethers";
import { getEpochFromId } from "../utils/timestampToEpoch";
import { computeMerkleTree, fetchUsers, getAccumulatedEmission, userBalancesToUnclaimedTokens } from "../utils";
import { commify, formatUnits } from "ethers/lib/utils";
import { finishedEpochs } from "../ages/ages";
import { SUBGRAPH_URL } from "../config";
import { sumRewards } from "../utils/getUserRewards";
import { FileSystemStorageService, StorageService } from "../utils/StorageService";
import { DataProvider, computeUsersDistributions } from "../utils/computeUsersDistributions";

dotenv.config();

const epochIdIndex = process.argv.indexOf("--epoch");
let epochId = undefined;
if (epochIdIndex !== -1) epochId = process.argv[epochIdIndex + 1];

const dataProviderIndex = process.argv.indexOf("--dataProvider");
let dataProvider = DataProvider.Subgraph;
if (dataProviderIndex !== -1) dataProvider = process.argv[dataProviderIndex + 1] as DataProvider;
if ([DataProvider.Subgraph, DataProvider.RPC].indexOf(dataProvider) === -1) throw new Error("Invalid data provider");

const storageService = new FileSystemStorageService();
computeUsersDistributions(DataProvider.Subgraph, storageService, epochId).then(() => console.log("Done"));
