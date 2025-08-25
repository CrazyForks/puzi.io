#!/bin/bash

# Script to build IDL separately from the program
set -e

echo "🔧 Building IDL for frontend..."
echo ""

# Build with IDL feature enabled (but don't deploy this version)
echo "Building with IDL feature..."
anchor build

# The IDL should now be in target/idl/
if [ -f "target/idl/puzi.json" ]; then
    echo "✅ IDL generated successfully!"
    echo "📍 Location: target/idl/puzi.json"
    
    # Copy to website directory if it exists
    if [ -d "../website/anchor-idl" ]; then
        echo ""
        echo "📋 Copying IDL to website..."
        cp target/idl/puzi.json ../website/anchor-idl/idl.json
        echo "✅ IDL copied to website/anchor-idl/idl.json"
    fi
    
    # Also generate TypeScript types
    if [ -f "target/types/puzi.ts" ]; then
        if [ -d "../website/anchor-idl" ]; then
            cp target/types/puzi.ts ../website/anchor-idl/idl.ts
            echo "✅ TypeScript types copied to website/anchor-idl/idl.ts"
        fi
    fi
    
    echo ""
    echo "📊 IDL size: $(ls -lh target/idl/puzi.json | awk '{print $5}')"
else
    echo "❌ IDL generation failed"
    exit 1
fi

echo ""
echo "💡 Note: This IDL build is NOT for deployment!"
echo "   Use ./build_ultra_optimized.sh for deployment (without IDL)"