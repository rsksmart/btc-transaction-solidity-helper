# Bitcoin Transaction Solidity Helper

The intention of this library is to make easier to work with Bitcoin transactions in Solidity smart contracts. Since Rootstock extends Bitcoin's capabilities by enabling smart contracts it is important to be able to work with Bitcoin transactions in them.

## Features

The features of this library will include:
* Bitcoin transaction output parsing: should be able to receive a raw tx and return an array of structs with the tx outputs
* Bitcoin transaction input parsing: should be able to receive a raw tx and return an array of structs with the tx inputs
* Bitcoin transaction hashing: should be able to receive a raw tx and return its hash
* Bitcoin transaction input/output script validation: should be able to receive a raw input/output script, validate that is from a specific type and return a result. E.g. receive a raw null-data script and return the embeded data in it
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