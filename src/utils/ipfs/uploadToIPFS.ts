import PinataSDK from "@pinata/sdk";

const pinataJWTKey = process.env.PINATA_JWT_KEY;
if (!pinataJWTKey) throw Error("Missing Pinata_JWT_KEY");
export const pinata = new PinataSDK({ pinataJWTKey });

export const uploadToIPFS = async (file: { name: string; body: any }, iteration = 0) => {
  if (iteration > +(process.env.IPFS_MAX_ITERATIONS ?? 10)) return;
  const { name, body } = file;
  console.log(`Pinning ${name} to IPFS, iteration ${iteration}`);
  try {
    await new Promise((r) => setTimeout(r, 1000));
    const resp = await pinata.pinJSONToIPFS(body, {
      pinataMetadata: { name },
      pinataOptions: { cidVersion: 0 },
    });
    console.log(`Added ${name} to IPFS`);
    return resp.IpfsHash;
  } catch (error) {
    console.error(`Unable to add ${name} to IPFS`);
    await uploadToIPFS(file, iteration + 1);
  }
};
