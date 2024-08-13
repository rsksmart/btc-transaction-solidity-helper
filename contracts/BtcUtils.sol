// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./OpCodes.sol";

/**
 * @title BtcUtils
 * @notice This library contains functionality to make easier to work with Bitcoin transactions in Solidity.
 * @notice This library is based in this document:
 *   https://developer.bitcoin.org/reference/transactions.html#raw-transaction-format
 */
library BtcUtils {
    uint8 private constant MAX_COMPACT_SIZE_LENGTH = 252;
    uint8 private constant MAX_BYTES_USED_FOR_COMPACT_SIZE = 8;

    uint private constant HASH160_SIZE = 20;
    uint private constant SHA256_SIZE = 32;
    uint private constant TAPROOT_PUBKEY_SIZE = 32;

    uint8 private constant OUTPOINT_SIZE = 36;
    uint8 private constant OUTPUT_VALUE_SIZE = 8;

    uint8 private constant PUBKEY_HASH_START = 3;
    bytes1 private constant PUBKEY_HASH_MAINNET_BYTE = 0x00;
    bytes1 private constant PUBKEY_HASH_TESTNET_BYTE = 0x6f;

    uint8 private constant SCRIPT_HASH_START = 2;
    bytes1 private constant SCRIPT_HASH_MAINNET_BYTE = 0x05;
    bytes1 private constant SCRIPT_HASH_TESTNET_BYTE = 0xc4;

    uint private constant BECH32_WORD_SIZE = 5;
    uint private constant BYTE_SIZE = 8;

    bytes1 private constant WITNESS_VERSION_0 = 0x00;
    bytes1 private constant WITNESS_VERSION_1 = 0x01;


    /**
     * @notice This struct contains the information of a tx output separated by fields
     * @notice Its just to have a structured representation of the output
     **/
    struct TxRawOutput {
        uint64 value;
        bytes pkScript;
        uint256 scriptSize;
        uint256 totalSize;
    }

    function version() external pure returns (string memory) {
        return "0.2.1";
    }

    /// @notice Parse a raw transaction to get an array of its outputs in a structured representation
    /// @param rawTx the raw transaction
    /// @return An array of `TxRawOutput` with the outputs of the transaction
    function getOutputs(bytes calldata rawTx) public pure returns (TxRawOutput[] memory) {
        uint currentPosition = 4;

        if (rawTx[4] == 0x00 && rawTx[5] == 0x01) { // if its segwit, skip marker and flag
            currentPosition = 6;
        }
        
        (uint64 inputCount, uint16 inputCountSize) = parseCompactSizeInt(currentPosition, rawTx);
        currentPosition += inputCountSize;

        uint64 scriptLarge;
        uint16 scriptLargeSize;
        for (uint64 i = 0; i < inputCount; i++) {
            currentPosition += OUTPOINT_SIZE;
            (scriptLarge, scriptLargeSize) = parseCompactSizeInt(currentPosition, rawTx);
            currentPosition += scriptLarge + scriptLargeSize + 4;
        }

        (uint64 outputCount, uint16 outputCountSize) = parseCompactSizeInt(currentPosition, rawTx);
        currentPosition += outputCountSize;

        TxRawOutput[] memory result = new TxRawOutput[](outputCount);
        for (uint i = 0; i < outputCount; i++) {
            result[i] = extractRawOutput(currentPosition, rawTx);
            currentPosition += result[i].totalSize;
        }
        return result;
    }

    function extractRawOutput(uint position, bytes memory rawTx) private pure returns (TxRawOutput memory) {
        TxRawOutput memory result = TxRawOutput(0, "", 0, 0);
        result.value = uint64(calculateLittleEndianFragment(position, position + OUTPUT_VALUE_SIZE, rawTx));
        position += OUTPUT_VALUE_SIZE;

        (uint64 scriptLength, uint16 scriptLengthSize) = parseCompactSizeInt(position, rawTx);
        position += scriptLengthSize;

        bytes memory pkScript = new bytes(scriptLength);
        for (uint64 i = 0; i < scriptLength; i++) {
            pkScript[i] = rawTx[position + i];
        }
        result.pkScript = pkScript;
        result.scriptSize = scriptLength;
        result.totalSize = OUTPUT_VALUE_SIZE + scriptLength + scriptLengthSize;
        return result;
    }

    /// @notice Parse a raw output script whose type is not known by the consumer. The function will
    /// return the corresponding address if the type of the script is supported or an error if not.
    /// For the addresses that are encoded with base58check the checksum bytes are not included in
    /// the resulting byte array
    /// @param outputScript the fragment of the raw transaction containing the raw output script
    /// @param mainnet if the address to generate is from mainnet or testnet
    /// @return The address bytes regarless of the output script type
    function outputScriptToAddress(bytes calldata outputScript, bool mainnet) public pure returns (bytes memory) {
        if (isP2PKHOutput(outputScript)) {
            return parsePayToPubKeyHash(outputScript, mainnet);
        }
        if (isP2SHOutput(outputScript)) {
            return parsePayToScriptHash(outputScript, mainnet);
        }
        if (isP2WPKHOutput(outputScript)) {
            return parsePayToWitnessPubKeyHash(outputScript);
        }
        if (isP2WSHOutput(outputScript)) {
            return parsePayToWitnessScriptHash(outputScript);
        }
        if (isP2TROutput(outputScript)) {
            return parsePayToTaproot(outputScript);
        }
        revert("Unsupported script type");
    }

    /// @notice Check if a raw output script is a pay-to-public-key-hash output
    /// @param pkScript the fragment of the raw transaction containing the raw output script
    /// @return Whether the script has a pay-to-public-key-hash output structure or not
    function isP2PKHOutput(bytes memory pkScript) public pure returns (bool) {
        return pkScript.length == 5 + HASH160_SIZE &&
            pkScript[0] == OpCodes.OP_DUP &&
            pkScript[1] == OpCodes.OP_HASH160 &&
            uint8(pkScript[2]) == HASH160_SIZE &&
            pkScript[23] == OpCodes.OP_EQUALVERIFY &&
            pkScript[24] ==  OpCodes.OP_CHECKSIG;
    }

    /// @notice Check if a raw output script is a pay-to-script-hash output
    /// @param pkScript the fragment of the raw transaction containing the raw output script
    /// @return Whether the script has a pay-to-script-hash output structure or not
    function isP2SHOutput(bytes memory pkScript) public pure returns (bool) {
        return pkScript.length == 3 + HASH160_SIZE &&
            pkScript[0] == OpCodes.OP_HASH160 &&
            uint8(pkScript[1]) == HASH160_SIZE &&
            pkScript[22] == OpCodes.OP_EQUAL;
    }

    /// @notice Check if a raw output script is a pay-to-witness-pubkey-hash output
    /// @param pkScript the fragment of the raw transaction containing the raw output script
    /// @return Whether the script has a pay-to-witness-pubkey-hash output structure or not
    function isP2WPKHOutput(bytes memory pkScript) public pure returns (bool) {
        return pkScript.length == 2 + HASH160_SIZE &&
            pkScript[0] == OpCodes.OP_0 &&
            uint8(pkScript[1]) == HASH160_SIZE;
    }

    /// @notice Check if a raw output script is a pay-to-witness-script-hash output
    /// @param pkScript the fragment of the raw transaction containing the raw output script
    /// @return Whether the script has a pay-to-witness-script-hash output structure or not
    function isP2WSHOutput(bytes memory pkScript) public pure returns (bool) {
        return pkScript.length == 2 + SHA256_SIZE &&
            pkScript[0] == OpCodes.OP_0 &&
            uint8(pkScript[1]) == SHA256_SIZE;
    }

    /// @notice Check if a raw output script is a pay-to-taproot output
    /// @notice Reference for implementation: https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki 
    /// @param pkScript the fragment of the raw transaction containing the raw output script
    /// @return Whether the script has a pay-to-taproot output structure or not
    function isP2TROutput(bytes memory pkScript) public pure returns (bool) {
        return pkScript.length == 2 + TAPROOT_PUBKEY_SIZE &&
            pkScript[0] == OpCodes.OP_1 &&
            uint8(pkScript[1]) == TAPROOT_PUBKEY_SIZE;
    }

    /// @notice Parse a raw pay-to-public-key-hash output script to get the corresponding address,
    /// the resulting byte array doesn't include the checksum bytes of the base58check encoding at
    /// the end
    /// @param outputScript the fragment of the raw transaction containing the raw output script
    /// @param mainnet if the address to generate is from mainnet or testnet 
    /// @return The address generated using the receiver's public key hash
    function parsePayToPubKeyHash(bytes calldata outputScript, bool mainnet) public pure returns (bytes memory) {
        require(isP2PKHOutput(outputScript), "Script hasn't the required structure");

        bytes memory destinationAddress = new bytes(HASH160_SIZE + 1);
        for(uint8 i = PUBKEY_HASH_START; i < HASH160_SIZE + PUBKEY_HASH_START; i++) {
            destinationAddress[i - PUBKEY_HASH_START + 1] = outputScript[i];
        }

        destinationAddress[0] = mainnet? PUBKEY_HASH_MAINNET_BYTE : PUBKEY_HASH_TESTNET_BYTE;
        return destinationAddress;
    }

    /// @notice Parse a raw pay-to-script-hash output script to get the corresponding address,
    /// the resulting byte array doesn't include the checksum bytes of the base58check encoding at
    /// the end
    /// @param outputScript the fragment of the raw transaction containing the raw output script
    /// @param mainnet if the address to generate is from mainnet or testnet
    /// @return The address generated using the script hash
    function parsePayToScriptHash(bytes calldata outputScript, bool mainnet) public pure returns (bytes memory) {
        require(isP2SHOutput(outputScript), "Script hasn't the required structure");

        bytes memory destinationAddress = new bytes(HASH160_SIZE + 1);
        for(uint8 i = SCRIPT_HASH_START; i < HASH160_SIZE + SCRIPT_HASH_START; i++) {
            destinationAddress[i - SCRIPT_HASH_START + 1] = outputScript[i];
        }

        destinationAddress[0] = mainnet? SCRIPT_HASH_MAINNET_BYTE : SCRIPT_HASH_TESTNET_BYTE;
        return destinationAddress;
    }

    /// @notice Parse a raw pay-to-witness-pubkey-hash output script to get the corresponding address words,
    /// the resulting words are only the data part of the bech32 encoding and doesn't include the HRP
    /// @param outputScript the fragment of the raw transaction containing the raw output script
    /// @return The address bech32 words generated using the pubkey hash
    function parsePayToWitnessPubKeyHash(bytes calldata outputScript) public pure returns (bytes memory) {
        require(isP2WPKHOutput(outputScript), "Script hasn't the required structure"); 
        uint length = 1 + total5BitWords(HASH160_SIZE);
        bytes memory result = new bytes(length);
        result[0] = WITNESS_VERSION_0;
        bytes memory words = to5BitWords(outputScript[2:]);
        for (uint i = 1; i < length; i++) {
            result[i] = words[i - 1];
        }
        return result;
    }

    /// @notice Parse a raw pay-to-witness-script-hash output script to get the corresponding address words,
    /// the resulting words are only the data part of the bech32 encoding and doesn't include the HRP
    /// @param outputScript the fragment of the raw transaction containing the raw output script
    /// @return The address bech32 words generated using the script hash
    function parsePayToWitnessScriptHash(bytes calldata outputScript) public pure returns (bytes memory) {
        require(isP2WSHOutput(outputScript), "Script hasn't the required structure");
        uint length = 1 + total5BitWords(SHA256_SIZE);
        bytes memory result = new bytes(length);
        result[0] = WITNESS_VERSION_0;
        bytes memory words = to5BitWords(outputScript[2:]);
        for (uint i = 1; i < length; i++) {
            result[i] = words[i - 1];
        }
        return result;
    }

    /// @notice Parse a raw pay-to-taproot output script to get the corresponding address words,
    /// the resulting words are only the data part of the bech32m encoding and doesn't include the HRP
    /// @param outputScript the fragment of the raw transaction containing the raw output script
    /// @return The address bech32m words generated using the taproot pubkey hash
    function parsePayToTaproot(bytes calldata outputScript) public pure returns (bytes memory) {
        require(isP2TROutput(outputScript), "Script hasn't the required structure");
        uint length = 1 + total5BitWords(TAPROOT_PUBKEY_SIZE);
        bytes memory result = new bytes(length);
        result[0] = WITNESS_VERSION_1;
        bytes memory words = to5BitWords(outputScript[2:]);
        for (uint i = 1; i < length; i++) {
            result[i] = words[i - 1];
        }
        return result;
    }

    /// @notice Parse a raw null-data output script to get its content
    /// @param outputScript the fragment of the raw transaction containing the raw output script 
    /// @return The content embedded inside the script
    function parseNullDataScript(bytes calldata outputScript) public pure returns (bytes memory) {
        require(outputScript.length > 1,"Invalid size");
        require(outputScript[0] == OpCodes.OP_RETURN, "Not OP_RETURN");
        return outputScript[1:];
    }

    /// @notice Hash a bitcoin raw transaction to get its id (reversed double sha256)
    /// @param btcTx the transaction to hash
    /// @return The transaction id 
    function hashBtcTx(bytes calldata btcTx) public pure returns (bytes32) {
        bytes memory doubleSha256 = abi.encodePacked(sha256(abi.encodePacked(sha256(btcTx))));
        bytes1 aux;
        for (uint i = 0; i < 16; i++) {
            aux = doubleSha256[i];
            doubleSha256[i] = doubleSha256[31 - i];
            doubleSha256[31 - i] = aux;
        }

        bytes32 result;
        assembly {
            result := mload(add(doubleSha256, 32))
        }
        return result;
    }

    /// @dev Gets the timestamp of a Bitcoin block header
    /// @param header The block header
    /// @return The timestamp of the block header
    function getBtcBlockTimestamp(bytes memory header) public pure returns (uint256) {
        // bitcoin header is 80 bytes and timestamp is 4 bytes from byte 68 to byte 71 (both inclusive)
        require(header.length == 80, "Invalid header length");

        return sliceUint32FromLSB(header, 68);
    }

    // bytes must have at least 28 bytes before the uint32
    function sliceUint32FromLSB(bytes memory bs, uint offset) private pure returns (uint32) {
        require(bs.length >= offset + 4, "Slicing out of range");

        return
        uint32(uint8(bs[offset])) |
        (uint32(uint8(bs[offset + 1])) << 8) |
        (uint32(uint8(bs[offset + 2])) << 16) |
        (uint32(uint8(bs[offset + 3])) << 24);
    }

    /// @notice Check if a pay-to-script-hash address belogs to a specific script, expects the address
    /// bytes to include the 4 checksum bytes at the end
    /// @param p2sh the pay-to-script-hash address
    /// @param script the script to check
    /// @param mainnet flag to specify if its a mainnet address
    /// @return Whether the address belongs to the script or not
    function validateP2SHAdress(bytes calldata p2sh, bytes calldata script, bool mainnet) public pure returns (bool) {
        return p2sh.length == 25 && keccak256(p2sh) ==  keccak256(getP2SHAddressFromScript(script, mainnet));
    }

    /// @notice Generate a pay-to-script-hash address from a script, the resulting byte array already contains
    /// the 4 checksum bytes at the end of it
    /// @param script the script to generate the address from
    /// @param mainnet flag to specify if the output should be a mainnet address
    /// @return The address generate from the script
    function getP2SHAddressFromScript(bytes calldata script, bool mainnet) public pure returns (bytes memory) {
        bytes20 scriptHash = ripemd160(abi.encodePacked(sha256(script)));
        bytes1 versionByte = mainnet ? SCRIPT_HASH_MAINNET_BYTE : SCRIPT_HASH_TESTNET_BYTE;
        bytes memory versionAndHash = bytes.concat(versionByte, scriptHash);
        bytes4 checksum = bytes4(sha256(abi.encodePacked(sha256(versionAndHash))));
        return bytes.concat(versionAndHash, checksum);
    }

    function parseCompactSizeInt(uint sizePosition, bytes memory array) private pure returns(uint64, uint16) {
        require(array.length > sizePosition, "Size position can't be bigger than array");
        uint8 maxSize = uint8(array[sizePosition]);
        if (maxSize == 0) {
            return (0, 1);
        } else if (maxSize <= MAX_COMPACT_SIZE_LENGTH) {
            return (maxSize, 1);
        }
        
        uint compactSizeBytes = 2 ** (maxSize - MAX_COMPACT_SIZE_LENGTH);
        require(compactSizeBytes <= MAX_BYTES_USED_FOR_COMPACT_SIZE, "unsupported compact size length");

        // the adition of 1 is because the first byte is the indicator of the size and its not part of the number
        uint64 result = uint64(
            calculateLittleEndianFragment(sizePosition + 1, sizePosition + compactSizeBytes + 1, array)
        );
        return (result, uint16(compactSizeBytes) + 1);
    }

    function calculateLittleEndianFragment(
        uint fragmentStart,
        uint fragmentEnd,
        bytes memory array
    ) private pure returns (uint) {
        require(
            fragmentStart < array.length && fragmentEnd < array.length, 
            "Range can't be bigger than array"
        );
        uint result = 0;
        for (uint i = fragmentStart; i < fragmentEnd; i++) {
            result += uint8(array[i]) *  uint64(2 ** (8 * (i - (fragmentStart))));
        }
        return result;
    }

    /// @notice Referece for implementation: https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki
    function to5BitWords(bytes memory byteArray) private pure returns(bytes memory) {
        uint8 MAX_VALUE = 31;

        uint currentValue = 0;
        uint bitCount = 0;
        uint8 resultIndex = 0;
        bytes memory result = new bytes(total5BitWords(byteArray.length));

        for (uint i = 0; i < byteArray.length; ++i) {
            currentValue = (currentValue << BYTE_SIZE) | uint8(byteArray[i]);
            bitCount += BYTE_SIZE;
            while (bitCount >= BECH32_WORD_SIZE) {
                bitCount -= BECH32_WORD_SIZE;
                // this mask ensures that the result will always have 5 bits
                result[resultIndex] = bytes1(uint8((currentValue >> bitCount) & MAX_VALUE));
                resultIndex++;
            }
        }

        if (bitCount > 0) {
            result[resultIndex] = bytes1(uint8((currentValue << (BECH32_WORD_SIZE - bitCount)) & MAX_VALUE));
        }
        return result;
    }

    function total5BitWords(uint numberOfBytes) private pure returns(uint) {
        uint total = (numberOfBytes * BYTE_SIZE) / BECH32_WORD_SIZE;
        bool extraWord = (numberOfBytes * BYTE_SIZE) % BECH32_WORD_SIZE == 0;
        return total + (extraWord? 0 : 1);
    }
}