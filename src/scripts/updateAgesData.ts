import "dotenv/config";
import { syncAgeConfig } from "./syncAgeConfig";
import ages from "../ages/ages.data.json";
import * as fs from "fs/promises";
import * as path from "path";

const updateAgesData = async () => {
  const changes = await syncAgeConfig();
  const agesDataPath = path.resolve(__dirname, "../ages/ages.data.json");
  const resulting = ages.map((age) => {
    const epochs = age.epochs.map((epoch) => {
      const epochChanges = changes.filter((c) => c.epoch === epoch.id);
      return epochChanges.reduce((ep, change) => {
        const parsed = +change.value;
        const value = isNaN(parsed) ? change.value : parsed;
        return { ...ep, [change.variable]: value };
      }, epoch);
    });
    return { ...age, epochs };
  });
  const data = JSON.stringify(resulting, null, 2);
  await fs.writeFile(agesDataPath, data);
};

updateAgesData();
