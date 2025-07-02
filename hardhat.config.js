require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    viaIR: true,
  },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    sepolia: {
      url: "https://1rpc.io/sepolia",
      accounts: [
        `0x${process.env.PRIVATE_KEY}`
      ],
      chainId: 11155111,
    }
  },
};
