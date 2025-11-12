#!/bin/bash
# Build script for vogoplus.app Chrome Extension

echo "🔨 Building vogoplus.app Chrome Extension..."

# Run vite build
npm run build

# Move HTML files to correct locations
echo "📦 Organizing files..."
mv dist/src/popup/index.html dist/popup/ 2>/dev/null || true
mv dist/src/options/index.html dist/options/ 2>/dev/null || true

# Remove src folder
rm -rf dist/src

# Copy manifest
cp manifest.json dist/

echo "✅ Build complete! Extension ready in dist/"
echo "📍 Load unpacked: chrome://extensions → Load 'dist' folder"

