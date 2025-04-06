#!/bin/bash

# Fix Node.js and better-sqlite3 version compatibility issues

# Detect current Node.js version
CURRENT_NODE_VERSION=$(node -v)
echo "Current Node.js version: $CURRENT_NODE_VERSION"

# Check for NVM
NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Fix NVM compatibility issue with npm_config_prefix
if [ -n "$npm_config_prefix" ]; then
  echo "⚠️ Unsetting npm_config_prefix for NVM compatibility"
  unset npm_config_prefix
fi

if command -v nvm > /dev/null; then
  echo "NVM is available. Will use compatible Node.js version."
  
  # Try using Node.js 20 (most compatible with recent better-sqlite3)
  if nvm ls 20 | grep -q "v20"; then
    echo "Using Node.js 20 from NVM"
    nvm use 20
  elif nvm ls 18 | grep -q "v18"; then
    echo "Using Node.js 18 from NVM"
    nvm use 18
  else
    echo "No compatible Node.js version found in NVM. Using current version."
  fi
else
  echo "NVM not found. Will try using system Node.js."
fi

# Rebuild better-sqlite3
echo "Rebuilding better-sqlite3 for current Node.js version..."
npm rebuild better-sqlite3

echo "Fix completed. Try running your application now."
