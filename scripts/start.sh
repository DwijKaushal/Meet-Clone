#!/bin/bash

# Start script for WebRTC Conferencing Application

echo "🚀 Starting WebRTC Conferencing Application..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first:"
    echo "   mongod"
    echo ""
    read -p "Press Enter to continue anyway or Ctrl+C to exit..."
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file. Please update it with your configuration."
    else
        echo "❌ .env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Install dependencies if needed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
fi

echo ""
echo "✅ Starting services..."
echo "   - Signaling Server: http://localhost:3001"
echo "   - WebSocket Server: ws://localhost:3002"
echo "   - React Client: http://localhost:3000"
echo ""

# Start server in background
echo "🔧 Starting signaling server..."
cd server && npm run dev &
SERVER_PID=$!

# Wait a bit for server to start
sleep 3

# Start client
echo "🎨 Starting React client..."
cd ../client && npm start &
CLIENT_PID=$!

echo ""
echo "✅ Services started!"
echo "   Server PID: $SERVER_PID"
echo "   Client PID: $CLIENT_PID"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for user interrupt
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit" INT TERM

wait
