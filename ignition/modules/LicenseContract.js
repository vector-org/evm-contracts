const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("LicenseContractModule", (m) => {

  const LicenseContractModule = m.contract("LicenseContract");

  return { LicenseContractModule };
});
