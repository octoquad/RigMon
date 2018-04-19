# Change Log

## 0.1

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

### Security

* Bump up version for moment from 2.19.1 to fix ReDOS vulnerability. See   moment/moment#4163