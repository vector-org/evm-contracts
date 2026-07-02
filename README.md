# EVM Based Contracts

**For Development**
1. Make sure to configure your `.env` with your private key and RPC URLs.
```sh
cp .env.example .env
```

## Using Foundry

This project now uses Foundry for smart contract development, compilation, and deployment.

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed

### Optional Nix development shell

If you use Nix, you can run the project without installing Foundry globally:

```sh
nix develop --no-pure-eval
```

With direnv installed, enable automatic shell activation for this checkout:

```sh
direnv allow
```

This setup is optional. Contributors who do not use Nix or direnv can keep using their normal local Foundry installation.

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
npm run deploy:factory-proxy
npm run deploy:primary-proxy
npm run deploy:secondary-proxy
```

Deploy all contracts at once:
```sh
npm run deploy:master-proxy
```

For specific networks (replace `sepolia` with your target network):
```sh
forge script script/MasterDeployment.s.sol:MasterDeployment --rpc-url sepolia --broadcast --verify
```

### ABI Export

After a broadcast deployment, export contract ABIs and addresses to `exports/abi/`:

```sh
npm run export:vector
```

### Directory Structure
- `src/` - Smart contracts
- `script/` - Deployment scripts  
- `test/` - Test files
- `lib/` - Dependencies (managed by Foundry)
- `out/` - Compiled artifacts
- `exports/` - Generated local export artifacts
