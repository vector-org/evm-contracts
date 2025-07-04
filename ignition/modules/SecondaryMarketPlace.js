const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SecondaryMarketPlaceModule", (m) => {

  const SecondaryMarketPlaceModule = m.contract("SecondaryMarketPlace",[
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0x1d72B383cd2F783e4f2eDafE9D7544A3355507C2",
    "0x46bDB0c76b1E6a08882c6be275166cF0Dbfe4229"
  ]);

  return { SecondaryMarketPlaceModule };
});
