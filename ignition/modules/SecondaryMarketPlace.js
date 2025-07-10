const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SecondaryMarketPlaceModule", (m) => {

  const SecondaryMarketPlaceModule = m.contract("SecondaryMarketPlace",[
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0x12Bb415B87354598F5cd3aeaD095068A348195Af",
    "0x36C77304a25ec71Cb074e03e11699c7360B3Fcd5"
  ]);

  return { SecondaryMarketPlaceModule };
});
