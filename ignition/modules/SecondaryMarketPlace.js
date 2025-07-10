const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SecondaryMarketPlaceModule", (m) => {
  const { LicenseFactoryModule } = m.useModule(require("./LicenseFactory"));
  const { PrimaryMarketPlaceModule } = m.useModule(require("./PrimaryMarketPlace"));

  const SecondaryMarketPlaceModule = m.contract("SecondaryMarketPlace", [
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    LicenseFactoryModule,
    PrimaryMarketPlaceModule,
  ]);

  return { SecondaryMarketPlaceModule };
});