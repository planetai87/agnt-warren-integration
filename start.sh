#!/bin/bash

# AGNT - One command setup and run

echo "🔵 AGNT - Starting..."

# Kill anything on port 3000
lsof -i :3000 2>/dev/null | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Run dev server
echo "🚀 Starting dev server on http://localhost:3000"
npm run dev
