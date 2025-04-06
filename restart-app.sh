#!/bin/bash

# Restart application with all the fixes
# This script will fix and restart the SQLite Visualizer

echo "🔧 Restarting SQLite Visualizer with all fixes applied..."

# Make sure we're in the project directory
cd "$(dirname "$0")"

# Stop any running processes
echo "🛑 Stopping any running processes..."
npm run stop

# Make sure the server is using the right version of Node.js and better-sqlite3
echo "📦 Setting up environment..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
if [ -n "$npm_config_prefix" ]; then
  echo "⚠️ Unsetting npm_config_prefix for NVM compatibility"
  unset npm_config_prefix
fi

# Use Node 20 if available
if command -v nvm > /dev/null; then
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

# Rebuild better-sqlite3 for the current Node.js version
echo "🔄 Rebuilding better-sqlite3..."
npm rebuild better-sqlite3

# Start the application in development mode
echo "🚀 Starting SQLite Visualizer..."
npm run dev