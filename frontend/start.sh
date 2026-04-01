#!/bin/bash

# Lakomi Cooperative Frontend - Quick Start Script

echo "🚀 Starting Lakomi Cooperative Frontend..."
echo ""

# Check if Anvil is running
echo "📡 Checking if Anvil is running..."
if curl -s http://127.0.0.1:8545 > /dev/null; then
    echo "✅ Anvil is running"
else
    echo "❌ Anvil is not running. Please start Anvil in another terminal:"
    echo "   anvil"
    echo ""
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🎯 Starting development server..."
echo "   Frontend will be available at: http://localhost:5173"
echo "   Press Ctrl+C to stop"
echo ""

npm run dev
