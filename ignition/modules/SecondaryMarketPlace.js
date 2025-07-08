const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SecondaryMarketPlaceModule", (m) => {

  const SecondaryMarketPlaceModule = m.contract("SecondaryMarketPlace",[
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0xC82a815602E1552347bb29944e5Fe44a4da438Fb",
    "0xc7FaF3455f3D8F3d413b2E7c8739775E57f958B6"
  ]);

  return { SecondaryMarketPlaceModule };
});
