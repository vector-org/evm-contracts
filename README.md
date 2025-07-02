# EVM Based Contracts

## Running 
1. Make sure to configure your `.env` with your private key 
```sh
cp .env.example .env
```

2. 
```sh
npx hardhat compile
npx hardhat ignition deploy ignition/modules/LicenseFactory.js --network sepolia #deploys the licensefactory
```
