export interface VaultConfiguration {
  address: string;
  deploymentBlock: number;
}
const configuration = {
  epochTo: undefined, // The epoch id to distribute to. If undefined, will distribute to the last ended epoch. EpochId = ageX-epochX
  vaults: [
    {
      address: "0xd508f85f1511aaec63434e26aeb6d10be0188dc7", // m-aave WBTC SV
      deploymentBlock: 15690157,
    },
    {
      address: "0xa5269a8e31b93ff27b887b56720a25f844db0529", // m-aave USDC SV
      deploymentBlock: 15690076,
    },
    {
      address: "0xafe7131a57e44f832cb2de78ade38cad644aac2f", // m-aave USDT SV
      deploymentBlock: 15690075,
    },
    {
      address: "0x9dc7094530cb1bcf5442c3b9389ee386738a190c", // m-aave CRV SV
      deploymentBlock: 15690075,
    },
    {
      address: "0x490bbbc2485e99989ba39b34802fafa58e26aba4", // m-aave WETH SV
      deploymentBlock: 15690523,
    },
    {
      address: "0x36f8d0d0573ae92326827c4a82fe4ce4c244cab6", // m-aave DAI SV
      deploymentBlock: 15689991,
    },
  ],
};
export default configuration;
