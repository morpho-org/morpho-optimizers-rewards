# how the graph tracking works?

## Before the beginning of the epoch
 All user & markets indexes are set at 1e36, (same behavior than Comp rewards) until the beginning of the epoch
 
## During the epoch
For all accounts which are making a tx during the epoch, the subgraph tracks the rewards emission by using 
a supply/ borrow speed predefined regarding the emission strategy. speed is an emission per block of Morpho tokens,
scaled with 18 decimals

## After the end of the epoch
For now, at the end of the epoch, we stop tracking transactions

## How tokens rewarded will be count?
At the end of the epoch, we will sum the unclaimed rewards tored into the graph with, for all markets, the rewards
accumulated since the last tx until the end of the epoch.
For users which have not made a tx during the epoch, we simply compute the following formula: 
``` 
balance * (finalIndex - initialIndex) 
```
where finalIndex is the index at the last block of the epoch;
