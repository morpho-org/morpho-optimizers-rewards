import "dotenv/config";
import PinataSDK from "@pinata/sdk";
import * as fs from "fs";
import * as path from "path";

const pinataJWTKey = process.env.PINATA_JWT_KEY;
if (!pinataJWTKey) console.error("Missing Pinata_JWT_KEY");
if (!pinataJWTKey) process.exit(0);
const pinata = new PinataSDK({ pinataJWTKey });

const readAllFiles = async (folders: string[]): Promise<string[]> => {
  const nested = await Promise.all(
    folders.map(async (folder) => {
      const result = await fs.promises.readdir(folder, { withFileTypes: true });
      const res = await Promise.all(
        result.map(async (r) => {
          if (r.isDirectory()) {
            const name = path.resolve(folder, r.name);
            return await readAllFiles([name]);
          } else {
            return [path.resolve(folder, r.name)];
          }
        })
      );
      return res.flat();
    })
  );
  return nested.flat();
};

const uploadToIPFS = async (file: { name: string; body: any }, iteration = 0) => {
  if (iteration > 10) return;
  const { name, body } = file;
  console.log(`Pinning ${name} to IPFS, iteration ${iteration}`);
  try {
    await new Promise((r) => setTimeout(r, 1000));
    await pinata.pinJSONToIPFS(body, {
      pinataMetadata: { name },
      pinataOptions: { cidVersion: 0 },
    });
    console.log(`Added ${name} to IPFS`);
  } catch (error) {
    console.error(`Unable to add ${name} to IPFS`);
    await uploadToIPFS(file, iteration + 1);
  }
};

const uploadProofsToPinata = async () => {
  const distribution = path.resolve(__dirname, "../../distribution");
  const allFolders = await fs.promises.readdir(distribution);
  const folders = allFolders
    .filter((f) => f.includes("age") || f.includes("proofs"))
    .map((f) => path.resolve(distribution, f));
  const files = await readAllFiles(folders);
  const canUse = await pinata.testAuthentication();
  if (!canUse.authenticated) throw new Error("Wrong Pinata Key");
  const rawFiles = await Promise.all(
    files.map(async (file) => {
      const parts = file.split("/").reverse();
      const index = parts.findIndex((str) => str === "distribution");
      const name = parts
        .slice(0, index)
        .reverse()
        .join("-")
        .replace(/\.json/, "");
      const content = await fs.promises.readFile(file, "utf-8");
      const body = JSON.parse(content);
      return { body, name };
    })
  );
  let newFiles = [...rawFiles];
  for await (const item of pinata.getFilesByCount({ status: "pinned" })) {
    if (typeof item === "number") continue;
    const n = typeof item.metadata.name === "string" ? item.metadata.name.padEnd(30) : item.metadata.name;
    console.log(`Skipping ${n}, already present`);
    newFiles = newFiles.filter((f) => f.name !== item.metadata.name);
  }
  for (const file of newFiles) await uploadToIPFS(file);
};

uploadProofsToPinata();
