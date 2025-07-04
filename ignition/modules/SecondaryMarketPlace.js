const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SecondaryMarketPlaceModule", (m) => {

  const SecondaryMarketPlaceModule = m.contract("SecondaryMarketPlace",[
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0x67743EefAa4B9Ba2afaB7179515B70B29A012114"
  ]);

  return { SecondaryMarketPlaceModule };
});
