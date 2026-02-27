#!/bin/bash
echo "--- Starting custom Vercel build ---"

# Move to client directory
cd client

# Clean aggressively
echo "Cleaning caches and node_modules..."
rm -rf node_modules
rm -f package-lock.json
npm cache clean --force

# Install dependencies including the problematic optional one unconditionally
echo "Installing dependencies..."
npm install --no-package-lock
npm install @rollup/rollup-linux-x64-gnu --save-optional --no-package-lock

# Build
echo "Building Vite project..."
npm run build

echo "--- Build complete ---"
