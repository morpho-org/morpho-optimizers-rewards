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
    {
      address: "0xf31ac95fe692190b9c67112d8c912ba9973944f2", // m-compound WBTC SV
      deploymentBlock: 15732696,
    },
    {
      address: "0xc2a4fba93d4120d304c94e4fd986e0f9d213ed8a", // m-compound USDT SV
      deploymentBlock: 15732696,
    },
    {
      address: "0xba9e3b3b684719f80657af1a19debc3c772494a0", // m-compound USDC SV
      deploymentBlock: 15732696,
    },
    {
      address: "0x496da625c736a2ff122638dc26dcf1bfdef1778c", // m-compound UNI SV
      deploymentBlock: 15732695,
    },
    {
      address: "0xaa768b85ec827ccc36d882c1814bcd27ec4a8593", // m-compound COMP SV
      deploymentBlock: 15732695,
    },
    {
      address: "0x676e1b7d5856f4f69e10399685e17c2299370e95", // m-compound WETH SV
      deploymentBlock: 15732695,
    },
    {
      address: "0x8f88eae3e1c01d60bccdc3db3cbd5362dd55d707", // m-compound DAI SV
      deploymentBlock: 15732694,
    },
  ],
};
export default configuration;
