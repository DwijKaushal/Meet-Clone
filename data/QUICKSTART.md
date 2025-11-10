# Quick Start Guide

## Prerequisites
- Node.js (v16+) installed
- MongoDB installed (optional - app works without it)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install all dependencies (root, server, and client)
npm run install:all
```

Or install separately:
```bash
npm install              # Root dependencies
cd server && npm install && cd ..   # Server dependencies
cd client && npm install && cd ..   # Client dependencies
```

### 2. Configure Environment Variables

**Create `.env` file in the root directory:**
```bash
cd /Users/macbook/Documents/Coding/Priojects/Cursor/Ashadullah
cp .env.example .env  # If .env.example exists, or create manually
```

Edit `.env`:
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/webrtc-conferencing
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

**Create `client/.env` file:**
```bash
cd client
# Create .env file with:
```

```env
REACT_APP_WS_URL=ws://localhost:3001/ws
REACT_APP_API_URL=http://localhost:3001
```

### 3. Start MongoDB (Optional)

The app works without MongoDB, but for full functionality:

```bash
# macOS
brew services start mongodb-community
# OR
mongod

# Linux
sudo systemctl start mongod
# OR
mongod
```

### 4. Start the Application

**Option A: Two Terminal Windows (Recommended for Development)**

**Terminal 1 - Start the Server:**
```bash
cd server
npm run dev
```

You should see:
```
✅ HTTP server running on port 3001
✅ WebSocket server running on ws://localhost:3001/ws
```

**Terminal 2 - Start the Client:**
```bash
cd client
npm start
```

The React app will automatically open at `http://localhost:3000`

**Option B: Using the Start Script**

```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

### 5. Use the Application

1. **Open your browser** to `http://localhost:3000`
2. **Enter your name** in the "Your Name" field
3. **Create a room** by clicking "Create New Room" OR
   **Join a room** by entering a room ID and clicking "Join Room"
4. **Allow permissions** when browser asks for camera/microphone access
5. **Start conferencing!**

## Troubleshooting

### Port Already in Use
If port 3000 or 3001 is already in use:
- Change `PORT` in server `.env` file
- Change `REACT_APP_API_URL` and `REACT_APP_WS_URL` in client `.env`

### MongoDB Connection Error
- This is **OK** - the app works without MongoDB
- To enable persistence, start MongoDB: `mongod`

### Camera/Microphone Not Working
- Check browser permissions
- Make sure you're using HTTPS in production (or localhost for development)

### CORS Errors
- Verify `CORS_ORIGIN` in server `.env` matches client URL
- Default is `http://localhost:3000`

## Development vs Production

**Development (Current Setup):**
- HTTP (not HTTPS) is fine for localhost
- MongoDB optional
- Hot reload enabled

**Production:**
- Must use HTTPS/WSS
- Requires TURN server for NAT traversal
- MongoDB recommended
- Build client: `cd client && npm run build`

## Quick Commands Reference

```bash
# Install all
npm run install:all

# Start server only
cd server && npm run dev

# Start client only
cd client && npm start

# Build client for production
cd client && npm run build

# Seed database (optional)
cd server && node ../scripts/seed.js
```
