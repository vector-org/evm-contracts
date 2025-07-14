# EVM Based Contracts 

## Running 
To run a demo ui with already deployed contracts and everything 
```sh
npm run dev-example
```

**For Development**
1. Make sure to configure your `.env` with your private key 
```sh
cp .env.example .env
```

```sh
npx hardhat compile
npx hardhat ignition deploy ignition/modules/LicenseFactory.js --network sepolia #deploys the licensefactory
# Add licensefactory address inside ignition/modules/PrimaryMarketPlace.js as the last constructor arguments
npx hardhat ignition deploy ignition/modules/PrimaryMarketPlace.js --network sepolia #deploys the primary marketplace
# Add licensefactory address and primary marketplace address inside ignition/modules/SecondaryMarketPlace.js as the second last and last constructor arguments
npx hardhat ignition deploy ignition/modules/SecondaryMarketPlace.js --network sepolia #deploys the secondary marketplace
```
