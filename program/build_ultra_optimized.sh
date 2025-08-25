#!/bin/bash

# Ultra-optimized build script for minimum program size
set -e

echo "=== Ultra Optimized Build ==="
echo "Building with maximum size reduction..."

# Clean previous builds
cargo clean

# Set optimization flags for minimal size (without LTO which causes issues)
export RUSTFLAGS="-C opt-level=z \
-C codegen-units=1 \
-C panic=abort \
-C overflow-checks=no \
-C debug-assertions=no \
-C strip=symbols \
-C inline-threshold=0 \
-C link-arg=-zstack-size=4096 \
-C link-arg=--gc-sections"

# Build with cargo-build-sbf
cargo build-sbf \
    --manifest-path programs/puzi/Cargo.toml \
    --sbf-out-dir target/deploy

# Apply additional stripping if possible
if [ -f "target/deploy/puzi.so" ]; then
    # Try to strip with llvm-strip if available
    if command -v llvm-strip &> /dev/null; then
        echo "Applying llvm-strip..."
        llvm-strip -s target/deploy/puzi.so 2>/dev/null || true
    fi
    
    # Try solana-objcopy for additional stripping
    if command -v solana-objcopy &> /dev/null; then
        echo "Applying solana-objcopy strip..."
        solana-objcopy --strip-all target/deploy/puzi.so target/deploy/puzi_stripped.so 2>/dev/null && \
        mv target/deploy/puzi_stripped.so target/deploy/puzi.so || true
    fi
fi

# Show results
echo ""
echo "Build complete! Program size:"
ls -lh target/deploy/puzi.so

# Calculate size and cost
CURRENT_SIZE=$(stat -f%z target/deploy/puzi.so 2>/dev/null || stat -c%s target/deploy/puzi.so 2>/dev/null)
SIZE_KB=$(echo "scale=2; $CURRENT_SIZE / 1024" | bc)

# More accurate deployment cost calculation
# Base cost is about 0.00890880 SOL per 2x the binary size (for rent exemption)
COST_SOL=$(echo "scale=4; $CURRENT_SIZE * 2 * 0.00000461 / 1" | bc)

echo ""
echo "Program size: ${SIZE_KB} KB (${CURRENT_SIZE} bytes)"
echo "Estimated deployment cost: ~${COST_SOL} SOL"

# Compare with original if we know it
ORIGINAL_SIZE=245760  # 240KB in bytes
if [ "$ORIGINAL_SIZE" -gt 0 ]; then
    REDUCTION=$((100 - (CURRENT_SIZE * 100 / ORIGINAL_SIZE)))
    echo "Size reduction: ${REDUCTION}% from original (240KB)"
fi