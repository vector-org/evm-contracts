require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
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
