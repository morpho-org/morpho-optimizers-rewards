# **Morpho Rewards emission**
To understand the $MORPHO rewards mechanisms, you can take a look at the [documentation](https://docs.morpho.xyz/usdmorpho/ages-and-epochs).

## **Get Started**

- Install node dependencies using `yarn`:

```
yarn
```

- Create an `.env` file and refer to the `.env.example` for the required environment variables.

- Run the script for the first epoch:

```
yarn start:age1:epoch1
```

## **Age 1**

You can read the code of the first epoch [here](https://github.com/morpho-labs/morpho-rewards/blob/main/src/ages/age-one/index.ts).

The subgraph used for automatic real-time indexation is available on the [hosted service of TheGraph](https://thegraph.com/hosted-service/subgraph/morpho-labs/morphoages?query=Get%20balances%20).

Steps by step, the script will:

- distribute the epoch's rewards by following the per-market distribution rule (see below)
- make a snapshot of users' positions at the beginning of the epoch
- fetch all the transactions completed during the epoch
- distribute rewards by following the per-user, per-market distribution rule (see below)
- build the [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree) of the rewards distribution

### **Per-market distribution rule**

For each epoch, we distribute a given amount of rewards (e.g. 350,000 MORPHO for Age 1 - Epoch 1) overall open markets, ponderated by the underlying market-specific USD TVL, computed at the first block of the epoch. This means that market ETH with `marketSupply` ETH supplied on the underlying pool, `marketBorrow` ETH borrowed from the underlying pool and a ETH at a price of `marketUSDPrice` at the first block of the epoch (according to Compound's protocol) will get the following amount of rewards distributed:totalEmission×(marketSupply+marketBorrow)×marketUSDPricetotalUSDTVL

### **Per-user, per-market distribution rule**

For a given market & a given side (supply/borrow), we distribute the rewards proportionally at `userBalance * period`, where userBalance is the balance of the user at a given time (at the beginning of the age or when a transaction occurs) and `period` is the delay since another transaction occurs. The output is visible in the `ages/age1` directory.

## **Epochs**

Morpho rewards are distributed through epochs (~3 weeks), with each epoch's per-market distribution ultimately being voted by the Morpho protocol's governance at the beginning of the Epoch. For now and until governance is set up, each epoch's per-market distribution is computed based on a given total emission distributed over open markets, based on their underlying TVL.

### **Epoch #1**

The first epoch started on 2022-06-08T17:00:06.000Z until 2022-07-13T17:00:00.000Z with a distribution of 350,000 $MORPHO to users who have a position on Morpho-Compound. You can check the [final user's distribution](https://github.com/morpho-labs/morpho-rewards/blob/main/ages/age1/epoch1/usersDistribution.json) and simulate the distribution again by running.

`SAVE_FILE=true yarn run start:age1:epoch1`
## **Claim Rewards**

You can directly claim your rewards by using the Morpho dapp here: [gov.morpho.xyz](https://gov.morpho.xyz/)

or by calling the `claim` function of the [Rewards Distributor](https://etherscan.io/address/0x3B14E5C73e0A56D607A8688098326fD4b4292135)

## **Compute Merkle Tree**

At the end of the first epoch, all tokens will be distributed.

To compute the Merkle tree, you can run

```bash
SAVE_FILE=true yarn run start:age1:epoch1
```

and browse the distribution over Morpho's users and the Merkle tree configuration in the folder `ages/age1/epoch1`