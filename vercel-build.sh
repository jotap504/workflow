#!/bin/bash
echo "--- Starting custom Vercel build with YARN ---"

# Move to client directory
cd client

# Clean aggressively
echo "Cleaning caches and node_modules..."
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock

# Install dependencies using Yarn (bypasses npm optional dependencies bug)
echo "Installing dependencies with Yarn..."
npm install -g yarn
yarn install

# Build
echo "Building Vite project..."
yarn build

echo "--- Build complete ---"
