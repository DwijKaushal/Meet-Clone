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

// Load environment variables
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
      } catch (error) {
        logger.warn(`Room created but not saved (MongoDB issue): ${roomId}`);
      }
    }

    res.json({ roomId, name: roomName });
  } catch (error) {
    logger.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const room = await Room.findOne({ roomId: req.params.roomId });
      if (room) return res.json(room);
    }

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

// WebSocket signaling server
const wss = new WebSocketServer({
  server,
  path: '/ws'
});

wss.on('connection', (ws, req) => {
  handleConnection(ws, req, wss);
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('✅ Connected to MongoDB');
    startServer();
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    logger.warn('⚠️ Starting server anyway (rooms will not persist)');
    startServer();
  });

// ✅ FIXED HERE — Bind to 0.0.0.0 so WebSocket works online
function startServer() {
  const port = process.env.PORT || 3001;

  // Fix URL – remove accidental "https://" duplication
  const host = (process.env.RENDER_EXTERNAL_URL || `localhost:${port}`)
    .replace(/^https?:\/\//, '');

  server.listen(port, '0.0.0.0', () => {
    logger.info(`✅ HTTP server running on: https://${host}`);
    logger.info(`✅ WebSocket server running on: wss://${host}/ws`);
    logger.info(`🌐 Health check: https://${host}/health\n`);
  });
}


// MongoDB connection events
mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Retrying...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});
