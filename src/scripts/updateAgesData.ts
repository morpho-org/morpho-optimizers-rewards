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
      const epochChanges = changes.filter((c) => c.epochNumber === epoch.epochNumber);

      const allValues = epochChanges.reduce((acc, change) => {
        const parsed = +change.value;
        const value = isNaN(parsed) ? change.value : parsed;
        return { ...acc, [change.variable]: value };
      }, {});

      if (epochChanges.length > 0) console.log(`Updating epoch ${epoch.epochNumber}, ${JSON.stringify(allValues)}`);
      return { ...epoch, ...allValues };
    });
    return { ...age, epochs };
  });

  if (changes.length === 0) return console.log("Nothing to update, stopping");

  const data = JSON.stringify(resulting, null, 2);

  console.log("Writing results to ages.data.json");

  await fs.writeFile(agesDataPath, data);
};

updateAgesData();
