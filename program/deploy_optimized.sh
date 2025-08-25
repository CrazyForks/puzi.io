#!/bin/bash

# Deploy optimized program with maximum cost reduction
set -e

echo "=== Optimized Deployment Script ==="
echo "This script will help reduce deployment costs by:"
echo "1. Building with maximum size optimizations"
echo "2. Deploying with buffer strategy if needed"
echo ""

# Build with maximum optimizations
echo "Building optimized program..."
RUSTFLAGS="-C opt-level=z -C codegen-units=1 -C strip=symbols" \
anchor build --no-idl

# Check program size
SIZE=$(ls -l target/deploy/puzi.so | awk '{print $5}')
SIZE_KB=$((SIZE / 1024))
echo "Program size: ${SIZE_KB}KB"

# Estimate deployment cost
# Approximate: 1 byte = ~10 lamports for deployment
EST_COST_LAMPORTS=$((SIZE * 10))
EST_COST_SOL=$(echo "scale=4; $EST_COST_LAMPORTS / 1000000000" | bc)
echo "Estimated deployment cost: ~${EST_COST_SOL} SOL"

# Check if user wants to proceed
echo ""
read -p "Do you want to deploy? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Deploy with buffer strategy for cost optimization
    echo "Creating buffer account..."
    BUFFER=$(solana program write-buffer target/deploy/puzi.so | grep "Buffer" | awk '{print $2}')
    echo "Buffer created: $BUFFER"
    
    echo "Deploying program..."
    solana program deploy --buffer $BUFFER --program-id target/deploy/puzi-keypair.json
    
    echo "Deployment complete!"
else
    echo "Deployment cancelled."
fi