# **Morpho Rewards emission**
To understand the $MORPHO rewards mechanisms, you can take a look at the [documentation](https://docs.morpho.xyz/usdmorpho/ages-and-epochs).

## **Get Started**

- Install node dependencies using `yarn`:

```bash
yarn install --frozen-lockfile
```

- Create an `.env` file and refer to the `.env.example` for the required environment variables.

- Run the tests that are computing distribution and verifying the root on chain:

```
yarn test
```

# Distribution

You can check the documentation for a precise rule at each age:
- [Age 1 (08/06/2022 -> 20/09/2022)](https://docs.morpho.xyz/usdmorpho/ages-and-epochs/age-1)
- [Age 2 (20/09/2022 -> 29/12/2022)](https://docs.morpho.xyz/usdmorpho/ages-and-epochs/age-2)

## **Per-user, per-market distribution rule**

For a given market & a given side (supply/borrow), we distribute the rewards proportionally at the user balance. 
For example, if Alice balance is representing 10% of the Morpho balance, she is accruing 10% of the MORPHO tokens while she is representing 10%.
The speed of MORPHO distribution is static in first instance for a given set of epoch, market, side (supply/borrow), and computed from a rule voted 
by the governance for each epoch.


The subgraph used for automatic real-time indexation is available on the [hosted service of TheGraph](https://thegraph.com/hosted-service/subgraph/morpho-labs/morphoages?query=Get%20balances%20).


## **Per-market distribution process**

For each epoch, we distribute a given amount of rewards (e.g. 350,000 MORPHO for Age 1 - Epoch 1) overall open markets, ponderated by the underlying market-specific USD TVL, computed at the `snapshotBlock` of the epoch. This means that market ETH with `marketSupply` ETH supplied on the underlying pool, `marketBorrow` ETH borrowed from the underlying pool and a ETH at a price of `marketUSDPrice` at the first block of the epoch (according to Compound's protocol) will get the following amount of rewards distributed:totalEmission×(marketSupply+marketBorrow)×marketUSDPricetotalUSDTVL

You can compute the markets emissions using the following command: 

```bash
yarn markets:emissions
```
this will output the per-market emissions in the [distribution](./distribution) directory.


If you want to compute the emissions for a specific epoch, you can use the `--epoch` flag:

```bash
yarn markets:emissions --epoch age2-epoch1
```

## **Epochs**

Morpho rewards are distributed through epochs (~3 weeks), with each epoch's per-market distribution ultimately being voted by the Morpho protocol's governance at the beginning of the Epoch. For now and until governance is set up, each epoch's per-market distribution is computed based on a given total emission distributed over open markets, based on their underlying TVL.

## **Claim Rewards**

You can directly claim your rewards by using the Morpho dapp here: [gov.morpho.xyz](https://gov.morpho.xyz/)

or by calling the `claim` function of the [Rewards Distributor](https://etherscan.io/address/0x3B14E5C73e0A56D607A8688098326fD4b4292135)
with parameters coming from the last distribution in [proofs](./distribution/proofs) folder

## **Compute Merkle Tree**

At the end of each epoch, all tokens will be distributed.

To compute the Merkle tree, you can run the tests which are verifying the result with the ones of the [proofs](./distribution/proofs) folder

```bash
yarn test
```

### Terminate an epoch and updating the Merkle tree root on chain
After each epoch, Morpho Labs is computing the Rewards distribution and submitting the new root to the Morpho governance. 
The process can take some time after the end of the epoch, that can lead users to not be able to claim rewards from the last epoch for a short time.
In the Morpho Labs dapp, you will be able to see your rewards with a field "Claimable soon" in the Claim Modal, which is representing the amount claimable after the 
update of the root on chain (rewards of the previous epoch). You are still able to claim the rewards of the older epochs (n - 2) and still accruing rewards for the current epoch n


## Rounding errors
Due to rounding errors, the total amount distributed has a precision of more or less 10e-9 MORPHO distributed (over all markets) for age 1, and 10e-2 for the age 2.


# Vault distribution
The ERC4626 is a standard for vaults, which [is used on top of the Morpho protocol](https://github.com/morpho-labs/morpho-tokenized-vaults) to aggregate users.
Each Vault Contract has MORPHO rewards distributed from main distribution, and must redistribute rewards to users who are depositing their tokens in the vaults.

`morpho-rewards` is providing a standardized script to redistribute MORPHO rewards to vaults users through a dedicated merkle tree.

To use it, you can change the configuration here: [src/vaults/script/configuration.ts](.src/vaults/script/configuration.ts) with your own Vaults parameters.

Then, you can run the script to compute the distribution and the Merkle tree:

```bash
yarn vaults:distribute
```

The output will be in the `distribution/vaults` folder.
By default, the script provides only the last epoch merkle tree, but if
you want to have per-epoch distribution, you can run the script with the flag `--save-history` to save the distribution of each epoch:


```bash
yarn vaults:distribute --save-history
```

You can also merge all your vaults distributions to only one Merkle tree by using the flag `--merge-trees`:
It is useful when you have multiple vaults, and you want to merge all the distributions to only one Merkle tree.

```bash
yarn vaults:distribute --merge-trees --save-history
```

