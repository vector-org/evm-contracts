const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SecondaryMarketPlaceModule", (m) => {

  const SecondaryMarketPlaceModule = m.contract("SecondaryMarketPlace",[
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0xFbE36b09339adbA36824e4b966214F2F298A3716",
    "0x8C73D5740667dC011040f1cBa90fb81ebFF8Cc71"
  ]);

  return { SecondaryMarketPlaceModule };
});
