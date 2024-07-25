import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-solhint";
import "hardhat-gas-reporter";
import 'solidity-coverage';

const config: HardhatUserConfig = {
  solidity: "0.8.18",
};

export default config;
