# EVM Based Contracts 

Note : The `PrimaryMarketPlace` contract does not handle ETH Transfers yet.

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

## Using Foundry

This project now uses Foundry for smart contract development, compilation, and deployment.

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed

### Compilation
```sh
forge install && npm install
forge build
# or using npm script
npm run compile
```

### Testing
```sh
forge test
# or using npm script  
npm run test
```

### Deployment

Deploy individual contracts:
```sh
npm run deploy:license-factory
npm run deploy:primary-marketplace  
npm run deploy:secondary-marketplace
```

Deploy all contracts at once:
```sh
npm run deploy:master
```

For specific networks (replace `sepolia` with your target network):
```sh
forge script script/MasterDeployment.s.sol:MasterDeployment --rpc-url sepolia --broadcast --verify
```

### Directory Structure
- `src/` - Smart contracts
- `script/` - Deployment scripts  
- `test/` - Test files
- `lib/` - Dependencies (managed by Foundry)
- `out/` - Compiled artifacts
