#!/bin/bash

SCRIPT_NAME=${1:-"MasterDeployment.s.sol"}
CHAIN_ID=${2:-"13388"}
BROADCAST_DIR="./broadcast"
RPC_URL="https://explorer.evm.wasm.host/api/eth-rpc"
VERIFIER="blockscout"
VERIFIER_URL="https://explorer.evm.wasm.host/api/"

declare -A CONTRACT_SOURCES=(
    ["LicenseFactory"]="src/LicenseFactory.sol:LicenseFactory"
    ["PrimaryMarketPlace"]="src/PrimaryMarketPlace.sol:PrimaryMarketPlace"
    ["SecondaryMarketPlace"]="src/SecondaryMarketPlace.sol:SecondaryMarketPlace"
    ["LicenseContract"]="src/LicenseContract.sol:LicenseContract"
)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    if ! command -v jq &> /dev/null; then
        print_error "jq is required but not installed. Please install jq first."
        print_status "On macOS: brew install jq"
        print_status "On Ubuntu/Debian: sudo apt-get install jq"
        exit 1
    fi
}

verify_contract() {
    local address=$1
    local contract_name=$2
    local source_path=$3
    
    print_status "Verifying $contract_name at $address..."
    
    export ETHERSCAN_API_KEY="dummy"
    
    if forge verify-contract \
        --rpc-url "$RPC_URL" \
        --verifier "$VERIFIER" \
        --verifier-url "$VERIFIER_URL" \
        "$address" \
        "$source_path"; then
        print_success "Successfully submitted verification for $contract_name"
        echo "    Explorer URL: https://explorer.evm.wasm.host/address/$address"
    else
        print_error "Failed to verify $contract_name at $address"
        return 1
    fi
    
    echo
}

verify_from_broadcast() {
    local broadcast_file="$BROADCAST_DIR/$SCRIPT_NAME/$CHAIN_ID/run-latest.json"
    
    if [[ ! -f "$broadcast_file" ]]; then
        print_error "Broadcast file not found: $broadcast_file"
        print_status "Available files:"
        find "$BROADCAST_DIR" -name "*.json" 2>/dev/null || echo "No broadcast files found"
        exit 1
    fi
    
    print_status "Reading broadcast file: $broadcast_file"
    
    local deployments=$(jq -r '.transactions[] | select(.transactionType == "CREATE") | "\(.contractName)|\(.contractAddress)"' "$broadcast_file")
    
    if [[ -z "$deployments" ]]; then
        print_warning "No deployment transactions found in broadcast file"
        exit 1
    fi
    
    local verified_count=0
    local total_count=0
    
    while IFS='|' read -r contract_name contract_address; do
        if [[ -n "$contract_name" && -n "$contract_address" ]]; then
            total_count=$((total_count + 1))
            
            local source_path="${CONTRACT_SOURCES[$contract_name]}"
            
            if [[ -z "$source_path" ]]; then
                print_warning "No source mapping found for $contract_name, skipping..."
                print_status "Available mappings: ${!CONTRACT_SOURCES[*]}"
                continue
            fi
            
            if verify_contract "$contract_address" "$contract_name" "$source_path"; then
                verified_count=$((verified_count + 1))
            fi
        fi
    done <<< "$deployments"
    
    echo "=========================================="
    print_status "Verification Summary:"
    print_success "Successfully verified: $verified_count/$total_count contracts"
    
    if [[ $verified_count -eq $total_count ]]; then
        print_success "All contracts verified successfully!"
    elif [[ $verified_count -gt 0 ]]; then
        print_warning "Some contracts failed verification"
    else
        print_error "No contracts were verified"
        exit 1
    fi
}

# Function to show help
show_help() {
    echo "Usage: $0 [SCRIPT_NAME] [CHAIN_ID]"
    echo ""
    echo "Automatically verifies deployed contracts from Forge broadcast files"
    echo ""
    echo "Arguments:"
    echo "  SCRIPT_NAME   Name of the deployment script (default: MasterDeployment.s.sol)"
    echo "  CHAIN_ID      Chain ID where contracts were deployed (default: 13388)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Use default values"
    echo "  $0 MasterDeployment.s.sol 13388      # Verify from specific script and chain"
    echo "  $0 MyScript.s.sol 1                  # Verify from custom script on mainnet"
    echo ""
    echo "Environment Variables:"
    echo "  RPC_URL       RPC endpoint (default: https://explorer.evm.wasm.host/api/eth-rpc)"
    echo "  VERIFIER_URL  Verification service URL (default: https://explorer.evm.wasm.host/api/)"
    echo ""
    echo "Contract Source Mappings:"
    for key in "${!CONTRACT_SOURCES[@]}"; do
        echo "  $key -> ${CONTRACT_SOURCES[$key]}"
    done
}

main() {
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_help
        exit 0
    fi
    
    print_status "Contract Verification Script"
    print_status "Script: $SCRIPT_NAME"
    print_status "Chain ID: $CHAIN_ID"
    print_status "RPC URL: $RPC_URL"
    print_status "Verifier URL: $VERIFIER_URL"
    echo
    
    check_dependencies
    
    verify_from_broadcast
}

main "$@"
