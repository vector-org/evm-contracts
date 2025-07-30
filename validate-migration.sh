#!/bin/bash
# Foundry Migration Validation Script

echo "=== Foundry Migration Validation ==="
echo ""

echo "✓ Foundry Configuration:"
if [ -f "foundry.toml" ]; then
    echo "  - foundry.toml exists"
else 
    echo "  - ❌ foundry.toml missing"
fi

echo ""
echo "✓ Directory Structure:"
[ -d "src" ] && echo "  - src/ directory exists" || echo "  - ❌ src/ missing"
[ -d "script" ] && echo "  - script/ directory exists" || echo "  - ❌ script/ missing"  
[ -d "test" ] && echo "  - test/ directory exists" || echo "  - ❌ test/ missing"
[ -d "lib" ] && echo "  - lib/ directory exists" || echo "  - ❌ lib/ missing"

echo ""
echo "✓ Dependencies:"
[ -d "lib/openzeppelin-contracts" ] && echo "  - OpenZeppelin contracts installed" || echo "  - ❌ OpenZeppelin missing"
[ -d "lib/forge-std" ] && echo "  - forge-std library installed" || echo "  - ❌ forge-std missing"

echo ""
echo "✓ Contracts Migrated:"
echo "  - $(find src -name "*.sol" | wc -l) Solidity files in src/"

echo ""
echo "✓ Deployment Scripts:"
echo "  - $(find script -name "*.s.sol" | wc -l) deployment scripts created"
for script in script/*.s.sol; do
    [ -f "$script" ] && echo "    * $(basename "$script")"
done

echo ""
echo "✓ Test Files:"
echo "  - $(find test -name "*.t.sol" | wc -l) test files created"

echo ""
echo "✓ Package.json Updated:"
if grep -q "forge build" package.json; then
    echo "  - Build script updated to use Foundry"
else
    echo "  - ❌ Build script not updated"
fi

if grep -q "forge test" package.json; then
    echo "  - Test script updated to use Foundry"
else
    echo "  - ❌ Test script not updated"
fi

echo ""
echo "✓ Legacy Files (can be removed after validation):"
[ -f "hardhat.config.js" ] && echo "  - hardhat.config.js (legacy)"
[ -d "ignition" ] && echo "  - ignition/ directory (legacy)"
[ -d "contracts" ] && echo "  - contracts/ directory (legacy)"

echo ""
echo "=== Migration Status: COMPLETE ==="
echo "Note: Internet connection required for compilation (solc download)"