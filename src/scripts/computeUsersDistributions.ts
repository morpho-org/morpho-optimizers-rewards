import * as dotenv from "dotenv";
import { FileSystemStorageService } from "../utils/StorageService";
import { DataProvider, computeUsersDistributions } from "../utils/computeUsersDistributions";

dotenv.config();

const epochIdIndex = process.argv.indexOf("--epoch");
let epochNumber = undefined;
if (epochIdIndex !== -1) {
  epochNumber = parseFloat(process.argv[epochIdIndex + 1]);
  if (isNaN(epochNumber)) throw new Error("Invalid epoch id");
}

const dataProviderIndex = process.argv.indexOf("--dataProvider");
let dataProvider = DataProvider.Subgraph;
if (dataProviderIndex !== -1) dataProvider = process.argv[dataProviderIndex + 1] as DataProvider;
if ([DataProvider.Subgraph, DataProvider.RPC].indexOf(dataProvider) === -1) throw new Error("Invalid data provider");

const storageService = new FileSystemStorageService();
computeUsersDistributions(DataProvider.Subgraph, storageService, epochNumber, true).then(() => console.log("Done"));
