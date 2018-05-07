# Change Log

## 0.1 - Unreleased

### Enhancements

#### Balances
* Return "No Bittrex or Poloniex accounts configured." when both Bittrex and Poloniex accounts have not been configured.

#### History
* Return "No Bittrex or Poloniex accounts configured." when both Bittrex and Poloniex accounts have not been configured.

#### Statistics
* Removed pre tags for response.
* Command header is now bold.
* Statistics are now layed out over multiple lines for mining rigs.
* If Rigmon has just started and is still fetching data from the remote API and a user requests statistics, we now return "Mining rigs are not present as yet." instead of just a **Statistics** command header.

### Detailed

* Removed pre tags for response.
* Command header is now bold.
* Offline miners will now show &#9888; e.g. "Miner X is offline &#9888;"
* If a miners graphics card has stalled (0 hash rate) we now show &#9888; for the graphics card currently not working.
* Miner graphic cards are now numbered and show the current cryptocurrency being mined e.g. "5 (ETH):"
* If Rigmon has just started and is still fetching data from the remote API and a user requests statistics, we now return "Mining rigs are not present as yet." instead of just a **Detailed Statistics** command header.

### Security

* Bump up version for moment from 2.19.1 to fix ReDOS vulnerability. See [Moment #4163](https://github.com/moment/moment/issues/4163)
