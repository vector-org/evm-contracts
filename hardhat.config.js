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
      url: "https://sepolia.infura.io/v3/2WCbZ8YpmuPxUtM6PzbFOfY5k4B",
      accounts: [
        `0x${process.env.PRIVATE_KEY}`
      ],
      chainId: 11155111,
    },
    arbitrumSepolia: {
      url: "https://arbitrum-sepolia.infura.io/v3/2WCbZ8YpmuPxUtM6PzbFOfY5k4B",
      accounts: [
        `0x${process.env.PRIVATE_KEY}`
      ],
      chainId: 421614,
    },
    baseSepolia: {
      url: "https://base-sepolia.infura.io/v3/2WCbZ8YpmuPxUtM6PzbFOfY5k4B",
      accounts: [
        `0x${process.env.PRIVATE_KEY}`
      ],
      chainId: 84532,
    },
    vector: {
      url: "http://localhost:8545",
      accounts: [
        `0x${process.env.EVM_COSMOS_PVT_KEY}`
      ],
      chainId: 4221,
    }
  },
};
