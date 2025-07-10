const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("PrimaryMarketPlaceModule", (m) => {

  const PrimaryMarketPlaceModule = m.contract("PrimaryMarketPlace", [
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0x12Bb415B87354598F5cd3aeaD095068A348195Af"
  ]);

  return { PrimaryMarketPlaceModule };
});
