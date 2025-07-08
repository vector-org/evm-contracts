const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("PrimaryMarketPlaceModule", (m) => {

  const PrimaryMarketPlaceModule = m.contract("PrimaryMarketPlace", [
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0xC82a815602E1552347bb29944e5Fe44a4da438Fb"
  ]);

  return { PrimaryMarketPlaceModule };
});
