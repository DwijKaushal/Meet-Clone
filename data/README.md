<<<<<<< HEAD
# WebRTC-Conferencing
# WebRTC Multi-Party Conferencing

A comprehensive multi-party audio/video conferencing application using WebRTC for peer-to-peer media and Node.js signaling server.

## Features


## Prerequisites


## Quick Start

### 1. Install Dependencies

```bash
npm run install:all
```

Or install separately:

```bash
# Root dependencies
npm install

# Server dependencies
cd server && npm install && cd ..

# Client dependencies
cd client && npm install && cd ..
```

### 2. Configure Environment

Create `.env` file in the root directory:

```bash
# Copy the example (if available)
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/webrtc-conferencing
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=24h
STUN_SERVER=stun:stun.l.google.com:19302
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

For the client, create `client/.env`:

```env
REACT_APP_WS_URL=ws://localhost:3001/ws
REACT_APP_API_URL=http://localhost:3001
```

### 3. Start MongoDB

Ensure MongoDB is running:

```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or run directly
mongod
```

### 4. Seed Database (Optional)

```bash
cd server
node ../scripts/seed.js
```

### 5. Start Services

#### Option A: Using the start script

```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

#### Option B: Manual start (recommended for development)

**Terminal 1 - Signaling Server:**
```bash
cd server
npm run dev
```

**Terminal 2 - React Client:**
```bash
cd client
npm start
```

The application will be available at:

## Usage

1. **Create or Join a Room**
   - Enter your display name
   - Enter a room ID to join an existing room, or
   - Click "Create New Room" to create a new room

2. **In the Conference**
   - Allow camera/microphone permissions when prompted
   - Use controls to mute/unmute audio/video
   - Click screen share button to share your screen
   - Use the chat button to open/close chat panel
   - Click device settings to switch cameras/microphones

3. **Leave the Room**
   - Click the "Leave" button
   - All connections will be closed gracefully

## Project Structure

```
├── server/                    # Node.js signaling server
│   ├── handlers/             # WebSocket connection handlers
│   ├── models/               # MongoDB models (Room, Participant, CallStat)
│   ├── middleware/           # Authentication middleware
│   ├── utils/                # Utilities (logger)
│   ├── index.js              # Main server file
│   └── package.json
├── client/                    # React frontend
│   ├── public/               # Public assets
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── RoomJoin.js   # Room join interface
│   │   │   ├── ConferenceRoom.js  # Main conference UI
│   │   │   ├── VideoTile.js  # Video tile component
│   │   │   ├── Controls.js  # Media controls
│   │   │   └── ChatPanel.js  # Chat interface
│   │   ├── hooks/
│   │   │   └── useWebRTC.js  # WebRTC logic hook
│   │   ├── App.js            # Main app component
│   │   └── index.js          # Entry point
│   └── package.json
├── scripts/                  # Utility scripts
│   ├── start.sh             # Start script
│   └── seed.js              # Database seed script
├── .env.example              # Environment variables example
├── package.json              # Root package.json
└── README.md
```

## Architecture

### Signaling Server

### WebRTC Client

### Key Technologies

## Configuration

### STUN/TURN Servers

For production, configure your own TURN server:

```env
TURN_SERVER=turn:your-turn-server.com:3478
TURN_USERNAME=your-username
TURN_PASSWORD=your-password
```

You can use services like:

### Bandwidth Settings

Adjust video constraints in `client/src/hooks/useWebRTC.js`:

```javascript
const constraints = {
  audio: true,
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  }
};
```

## Troubleshooting

### Camera/Microphone Not Working

### Connection Issues

### MongoDB Connection Error

### WebSocket Connection Failed

## Production Deployment

1. **Environment Variables**: Set production values
2. **HTTPS**: Required for WebRTC (use Let's Encrypt or similar)
3. **TURN Server**: Essential for production NAT traversal
4. **MongoDB**: Use managed service (MongoDB Atlas)
5. **Build Client**: `cd client && npm run build`
6. **PM2**: Use PM2 or similar for process management

## Security Considerations


## License

MIT
