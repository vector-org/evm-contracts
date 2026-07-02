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
nix develop
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

### VECTOR staking

`VECTORStaking` is a lockbox contract for the staking UI. Users can lock and
unlock VECTOR immediately; reward distribution is intentionally not part of this
contract yet.

Eligibility uses UTC calendar-month buckets based on the accepted
`block.timestamp`. A stake made in month `M` first counts in month `M + 1`, so a
July stake is pending during July and eligible during August. Future reward
processors should distribute only for closed month windows using finalized chain
data, not local server wallclock time.

If VECTOR transfer tax is enabled or may be enabled, mark the staking contract as
tax-exempt after deployment:

```sh
cast send $VECTOR_TOKEN_ADDRESS \
  "setTaxExempt(address,bool)" \
  $VECTOR_STAKING_ADDRESS true \
  --private-key $PRIVATE_KEY \
  --rpc-url sepolia
```

### Directory Structure
- `src/` - Smart contracts
- `script/` - Deployment scripts  
- `test/` - Test files
- `lib/` - Dependencies (managed by Foundry)
- `out/` - Compiled artifacts
- `exports/` - Generated local export artifacts
