const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MasterDeploymentModule", (m) => {
  const { LicenseFactoryModule } = m.useModule(require("./LicenseFactory"));
  const { PrimaryMarketPlaceModule } = m.useModule(require("./PrimaryMarketPlace"));
  const { SecondaryMarketPlaceModule } = m.useModule(require("./SecondaryMarketPlace"));

  return { 
    LicenseFactoryModule,
    PrimaryMarketPlaceModule, 
    SecondaryMarketPlaceModule 
  };
});