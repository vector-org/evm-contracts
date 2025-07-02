const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("LicenseFactoryModule", (m) => {

  const LicenseFactoryModule = m.contract("LicenseFactory");

  return { LicenseFactoryModule };
});
