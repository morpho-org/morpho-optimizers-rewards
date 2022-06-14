# Morpho Rewards emission

## Configuration

You need to provide a RPC mainnet url first: 
```bash
cp .env.example .env
```

## Age 1

Run the script: 
```bash
yarn start:age1
```

You can read the code of the first age [here](./src/ages/age-one/index.ts)

Steps by step, the script will:
- distribute age emission rewards by following the market distribution rule
- make a snapshot of the users positions at the beginning of the age
- fetch all the transactions made during the age
- distribute rewards by following the User distribution rule
- build the merkle tree from the rewards emitted

The output is visible in the `ages` directory.


### Market distribution rule

At the first block of the epoch, we distribute rewards on each markets depending on the value of 
`(totalSupply + totalBorrow) * usdPrice`, where the price is taken at the first block (using the Compound Oracle).
`totalSupply` & `totalBorrow` are the total supplied/borrowed on the underlying pool.
The distribution between supply & borrow sides for a given market is done by the p2pIndexCursor, taken at the beginning of the epoch

### User distribution rule

For a given market & a given side (supply/borrow), we distribute the rewards proportionally at
`userBalance * period`, where userBalance is the balance of the user at a given time (at the beginning of the age, or when a transaction occurs)
and `period` is the delay since another transaction occurs. 

#### Some specific scenarios
- If the user only made one transaction for a specific market during the age, T is the time from the transaction to the end of the age.
- If the user has made a transaction before the beginning of the age, we start the delta T from the beginning of the age
- If the user made a new transaction, we recompute his balance and start a new period with a different balance

