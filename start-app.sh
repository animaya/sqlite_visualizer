#!/bin/bash

# SQLite Visualizer Startup Script
# This script ensures:
# 1. A compatible Node.js version is used
# 2. better-sqlite3 module is properly built for the current Node.js version
# 3. The client and server start correctly with proper port configuration

# Set up NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Fix NVM compatibility issue with npm_config_prefix
if [ -n "$npm_config_prefix" ]; then
  echo "⚠️ Unsetting npm_config_prefix for NVM compatibility"
  unset npm_config_prefix
fi

# Use Node.js 20 if available (best compatibility with better-sqlite3 v11)
if command -v nvm >/dev/null 2>&1; then
  echo "📦 Using NVM to manage Node.js version..."
  if nvm ls 20 | grep -q "v20"; then
    echo "✅ Switching to Node.js 20.x"
    nvm use 20
  elif nvm ls 18 | grep -q "v18"; then
    echo "✅ Switching to Node.js 18.x (fallback)"
    nvm use 18
  else
    echo "⚠️ No compatible Node.js version found in NVM. Using system Node.js."
  fi
else
  echo "⚠️ NVM not found. Using system Node.js: $(node -v)"
fi

# Navigate to project directory
cd "$(dirname "$0")"

# Make sure dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📥 Installing dependencies..."
  npm install
fi

if [ ! -d "client/node_modules" ]; then
  echo "📥 Installing client dependencies..."
  cd client && npm install && cd ..
fi

# Rebuild better-sqlite3 for the current Node.js version
echo "🔧 Rebuilding better-sqlite3 module..."
npm rebuild better-sqlite3

# Stop any existing processes
echo "🛑 Stopping any running instances..."
npm run stop

# Start the application in development mode
echo "🚀 Starting SQLite Visualizer..."
npm run dev