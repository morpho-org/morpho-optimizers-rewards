# Morpho Rewards emission

## Get Started

- Install node dependencies using `yarn`:
```bash
yarn
```

- Run the script for the first epoch:
```bash
yarn start:age1:epoch1
```

## Epochs

Morpho rewards are distributed through epochs (~3 weeks), with each epoch's per-market distribution ultimately being voted by Morpho protocol's governance, at the beginning of the epoch.
For now and until governance is set up, each epoch's per-market distribution is computed based on a given total emission distributed over open markets, based on their underlying TVL.

## Epoch #1

You can read the code of the first epoch [here](./src/ages/age-one/index.ts).

The subgraph used for automatic real time indexation is available on the [hosted service of TheGraph](https://thegraph.com/hosted-service/subgraph/morpho-labs/morphoages?query=Get%20balances%20).

Steps by step, the script will:
- distribute the epoch's rewards by following the per-market distribution rule (see below)
- make a snapshot of users' positions at the beginning of the epoch
- fetch all the transactions completed during the epoch
- distribute rewards by following the per-user, per-market distribution rule (see below)
- build the [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree) of the rewards distribution

The output is visible in the `ages` directory.


### Per-market distribution rule

For each epoch, we distribute a given amount of rewards (e.g. 500k for epoch #1) over all open markets, ponderated by the underlying market-specific USD TVL, computed at the first block of the epoch.
This means that market ETH with `marketSupply` ETH supplied on the underlying pool, `marketBorrow` ETH borrowed from the underlying pool and a ETH at a price of `marketUSDPrice` at the first block of the epoch (according to Compound's protocol), will get the following amount of rewards distributed:
$$totalEmission \times \frac{(marketSupply + marketBorrow) \times marketUSDPrice}{totalUSDTVL}$$

### Per-user, per-market distribution rule

For a given market & a given side (supply/borrow), we distribute the rewards proportionally at
`userBalance * period`, where userBalance is the balance of the user at a given time (at the beginning of the age, or when a transaction occurs)
and `period` is the delay since another transaction occurs.

#### Some specific scenarios

- If the user only made one transaction for a specific market during the age, T is the time from the transaction to the end of the age.
- If the user has made a transaction before the beginning of the age, we start the delta T from the beginning of the age
- If the user made a new transaction, we recompute his balance and start a new period with a different balance

## Compute merkle Tree
At the end of the first epoch, all tokens will be distributed.

In order to compute the merke tree, you can simply run

```bash 
SAVE_FILE=true yarn run start:age1:epoch1
```
and browse the distribution over Morpho's users, and the merkle tree configuration in the folder `ages/age1/epoch1`
