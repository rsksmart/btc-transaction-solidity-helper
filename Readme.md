# Bitcoin Transaction Solidity Helper
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/rsksmart/btc-transaction-solidity-helper/badge)](https://scorecard.dev/viewer/?uri=github.com/rsksmart/btc-transaction-solidity-helper)

The intention of this library is to make easier to work with Bitcoin transactions in Solidity smart contracts. Since Rootstock extends Bitcoin's capabilities by enabling smart contracts it is important to be able to work with Bitcoin transactions in them.

## Features

The features of this library include:
* Bitcoin transaction output parsing: is able to receive a raw tx and return an array of structures with the tx outputs
* Bitcoin transaction hashing: is able to receive a raw tx and return its hash
* Bitcoin transaction output script validation: is able to receive a raw output script, validate that is from a specific type and return a result. E.g. receive a raw null-data script and return the embedded data in it
* Bitcoin address generation: is able to generate Bitcoin the address from a specific script and also to validate if a given address was generated from a script or not.
* Bitcoin address validation: is able to validate if a Bitcoin address is of a given type or not.

### Future features
These are some features that can increase the library capabilities in the future:
* Bitcoin transaction input parsing: should be able to receive a raw tx and return an array of structs with the tx inputs
* Bitcoin transaction creation: utilities for building a raw transaction inside a contract

## Usage
1. Run this command to install the contracts
 ```console
    npm install @rsksmart/btc-transaction-solidity-helper
 ```
2. Import the library in your contract
 ```solidity
    import "@rsksmart/btc-transaction-solidity-helper/contracts/BtcUtils.sol";
 ```
3. Use the library. E.g.:
 ```solidity
    BtcUtils.TxRawOutput[] memory outputs = BtcUtils.getOutputs(btcTx);
    bytes memory btcTxDestination = BtcUtils.parseNullDataScript(outputs[0].pkScript, false);
 ```
