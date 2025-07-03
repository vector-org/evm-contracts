const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("PrimaryMarketPlaceModule", (m) => {

  const PrimaryMarketPlaceModule = m.contract("PrimaryMarketPlace");

  return { PrimaryMarketPlaceModule };
});
