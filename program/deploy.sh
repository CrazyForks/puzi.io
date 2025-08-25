#!/bin/bash

# Complete deployment script with optimized build
set -e

echo "🚀 Optimized Deployment Process"
echo "================================"
echo ""

# Step 1: Build optimized program without IDL
echo "Step 1: Building optimized program (no IDL)..."
./build_ultra_optimized.sh

if [ ! -f "target/deploy/puzi.so" ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "Step 2: Building IDL for frontend..."
./build_idl.sh

echo ""
echo "================================"
echo "📊 Deployment Summary:"
echo ""

# Get program size and cost
if [[ "$OSTYPE" == "darwin"* ]]; then
    SIZE_BYTES=$(stat -f%z target/deploy/puzi.so)
else
    SIZE_BYTES=$(stat -c%s target/deploy/puzi.so)
fi

SIZE_KB=$(echo "scale=2; $SIZE_BYTES / 1024" | bc)
COST_SOL=$(echo "scale=4; $SIZE_BYTES * 2 * 0.00000461" | bc)

echo "  Program size: ${SIZE_KB} KB"
echo "  Estimated cost: ~${COST_SOL} SOL"
echo "  Program ID: 74CLmcpzW4EyqkeCT3ZK9vHga6DPBnTg9RccGgzagkp"
echo ""

# Step 3: Ask for deployment confirmation
echo "Ready to deploy?"
echo ""
echo "To deploy, run:"
echo "  solana program deploy target/deploy/puzi.so"
echo ""
echo "Or to deploy with specific keypair:"
echo "  solana program deploy target/deploy/puzi.so --program-id target/deploy/puzi-keypair.json"
echo ""
echo "💡 Tips:"
echo "  - Make sure you have enough SOL (~${COST_SOL} SOL needed)"
echo "  - Check your Solana CLI config: solana config get"
echo "  - Set cluster if needed: solana config set --url <RPC_URL>"