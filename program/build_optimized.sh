#!/bin/bash

# Build optimized Solana program with minimal size
set -e

echo "Building optimized program for minimal deployment cost..."

# Clean previous builds
cargo clean

# Build with maximum optimizations
RUSTFLAGS="-C link-arg=-z -C link-arg=stack-size=32768 -C opt-level=z -C codegen-units=1 -C strip=symbols" \
cargo build-sbf \
    --no-default-features \
    --features "no-log-ix-name no-idl"

# Check size
echo "Optimized program size:"
ls -lh target/deploy/*.so

# Optional: Further compress with UPX if available
if command -v upx &> /dev/null; then
    echo "Compressing with UPX..."
    cp target/deploy/puzi.so target/deploy/puzi_backup.so
    upx --best target/deploy/puzi.so || true
    echo "Compressed size:"
    ls -lh target/deploy/*.so
fi