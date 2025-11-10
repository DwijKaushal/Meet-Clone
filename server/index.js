import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from './utils/logger.js';
import { authenticateSocket } from './middleware/auth.js';
import { Room } from './models/Room.js';
import { Participant } from './models/Participant.js';
import { CallStat } from './models/CallStat.js';
import { handleConnection } from './handlers/connectionHandler.js';

// Load root .env first (if present) then local .env. This makes running
// the server from either the repo root or the server directory behave the same.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Room management endpoints
app.post('/api/rooms', async (req, res) => {
  try {
    const { name, createdBy } = req.body;
    const roomId = uuidv4();
    const roomName = name || `Room ${roomId.substring(0, 8)}`;
    
    // Try to save to MongoDB if available
    let saved = false;
    if (mongoose.connection.readyState === 1) {
      try {
        const room = new Room({
          roomId,
          name: roomName,
          createdBy: createdBy || 'Anonymous',
          createdAt: new Date()
        });
        await room.save();
        logger.info(`Room created and saved: ${roomId}`);
        saved = true;
      } catch (error) {
        logger.warn(`Room created (in-memory only): ${roomId} - MongoDB save failed`);
      }
    } else {
      logger.info(`Room created (in-memory only): ${roomId} - MongoDB not connected`);
    }
    
    res.json({ roomId, name: roomName });
  } catch (error) {
    logger.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room', details: error.message });
  }
});

app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    // Try to fetch from MongoDB if available
    if (mongoose.connection.readyState === 1) {
      try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (room) {
          return res.json(room);
        }
      } catch (error) {
        logger.debug('Error fetching room from MongoDB:', error);
      }
    }
    
    // If not in MongoDB or MongoDB not available, return room exists (in-memory mode)
    // This allows rooms to work without persistence
    res.json({ 
      roomId: req.params.roomId, 
      name: `Room ${req.params.roomId.substring(0, 8)}`,
      inMemory: true 
    });
  } catch (error) {
    logger.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

app.get('/api/rooms/:roomId/participants', async (req, res) => {
  try {
    const participants = await Participant.find({ roomId: req.params.roomId });
    res.json(participants);
  } catch (error) {
    logger.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

wss.on('connection', (ws, req) => {
  handleConnection(ws, req, wss);
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/webrtc-conferencing';

mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    startServer();
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    logger.warn('⚠️  MongoDB connection failed. Server will start but room persistence may not work.');
    logger.warn('💡 To fix: Start MongoDB with "mongod" or update MONGODB_URI in .env');
    logger.warn('   Starting server anyway for development/testing...\n');
    startServer();
  });

function startServer() {
  const port = process.env.PORT || 3001;
  server.listen(port, () => {
    logger.info(`✅ HTTP server running on port ${port}`);
    logger.info(`✅ WebSocket server running on ws://localhost:${port}/ws`);
    logger.info(`🌐 Health check: http://localhost:${port}/health\n`);
  });
}

// Handle MongoDB connection events
mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully');
});
