// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;


library OpCodes {
    bytes1 public constant OP_DUP = 0x76;
    bytes1 public constant OP_HASH160 = 0xa9;
    bytes1 public constant OP_EQUALVERIFY = 0x88;
    bytes1 public constant OP_CHECKSIG = 0xac;
    bytes1 public constant OP_RETURN = 0x6a;
    bytes1 public constant OP_EQUAL = 0x87;

    bytes1 public constant OP_0 = 0x00;
    bytes1 public constant OP_1 = 0x51;
}
