import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { authenticateSocket } from '../middleware/auth.js';
import { Participant } from '../models/Participant.js';
import { CallStat } from '../models/CallStat.js';
import { Room } from '../models/Room.js';

const rooms = new Map(); // In-memory room state
const connections = new Map(); // participantId -> ws mapping

export const handleConnection = (ws, req, wss) => {
  const correlationId = uuidv4();
  logger.info(`New connection attempt [${correlationId}]`);
  
  // Authentication (optional for demo - can be enhanced)
  const auth = authenticateSocket(ws, req);
  const userId = auth?.userId || uuidv4();
  
  let participantId = null;
  let roomId = null;
  let displayName = null;
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      logger.debug(`Message received [${correlationId}]:`, data.type);
      
      switch (data.type) {
        case 'join':
          await handleJoin(ws, data, userId, correlationId);
          break;
          
        case 'offer':
          handleOffer(ws, data, correlationId);
          break;
          
        case 'answer':
          handleAnswer(ws, data, correlationId);
          break;
          
        case 'ice-candidate':
          handleIceCandidate(ws, data, correlationId);
          break;
          
        case 'leave':
          await handleLeave(ws, correlationId);
          break;
          
        case 'toggle-audio':
          handleToggleAudio(ws, data, correlationId);
          break;
          
        case 'toggle-video':
          handleToggleVideo(ws, data, correlationId);
          break;
          
        case 'chat':
          handleChat(ws, data, correlationId);
          break;
          
        case 'typing':
          handleTyping(ws, data, correlationId);
          break;
          
        default:
          logger.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      logger.error(`Error processing message [${correlationId}]:`, error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });
  
  ws.on('close', async () => {
    logger.info(`Connection closed [${correlationId}]`);
    if (participantId) {
      await handleLeave(ws, correlationId);
    }
  });
  
  ws.on('error', (error) => {
    logger.error(`WebSocket error [${correlationId}]:`, error);
  });
  
  async function handleJoin(ws, data, userId, correlationId) {
    try {
      roomId = data.roomId;
      displayName = data.displayName || `User ${userId.substring(0, 8)}`;
      participantId = uuidv4();
      
      // Verify room exists (optional - works in-memory if MongoDB not available)
      try {
        const room = await Room.findOne({ roomId });
        if (!room) {
          logger.warn(`Room ${roomId} not found in database, allowing in-memory operation`);
        }
      } catch (error) {
        logger.warn('MongoDB not available, operating in-memory mode');
      }
      
      // Create participant record (optional)
      try {
        const participant = new Participant({
          participantId,
          roomId,
          userId,
          displayName,
          joinedAt: new Date(),
          isActive: true
        });
        await participant.save();
      } catch (error) {
        logger.debug('Could not save participant to MongoDB (operating in-memory)');
      }
      
      // Create call stat (optional)
      try {
        const callStat = new CallStat({
          roomId,
          participantId,
          joinTime: new Date()
        });
        await callStat.save();
      } catch (error) {
        logger.debug('Could not save call stat to MongoDB (operating in-memory)');
      }
      
      // Store connection
      connections.set(participantId, ws);
      ws.participantId = participantId;
      ws.roomId = roomId;
      
      // Initialize room in memory if not exists
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }
      rooms.get(roomId).set(participantId, {
        participantId,
        userId,
        displayName,
        isAudioEnabled: true,
        isVideoEnabled: true
      });
      
      // Notify others in the room
      const roomConnections = Array.from(rooms.get(roomId).keys())
        .map(id => connections.get(id))
        .filter(conn => conn && conn !== ws && conn.readyState === 1);
      
      roomConnections.forEach(otherWs => {
        otherWs.send(JSON.stringify({
          type: 'user-joined',
          participantId,
          displayName
        }));
      });
      
      // Send existing participants to new joiner
      const existingParticipants = Array.from(rooms.get(roomId).entries())
        .filter(([id]) => id !== participantId)
        .map(([id, info]) => ({
          participantId: id,
          displayName: info.displayName,
          isAudioEnabled: info.isAudioEnabled,
          isVideoEnabled: info.isVideoEnabled
        }));
      
      ws.send(JSON.stringify({
        type: 'joined',
        participantId,
        roomId,
        participants: existingParticipants
      }));
      
      // Broadcast presence update
      broadcastToRoom(roomId, ws, {
        type: 'presence-update',
        participantId,
        displayName,
        action: 'joined'
      });
      
      logger.info(`User joined [${correlationId}]: ${participantId} -> ${roomId}`);
    } catch (error) {
      logger.error(`Error handling join [${correlationId}]:`, error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to join room' }));
    }
  }
  
  function handleOffer(ws, data, correlationId) {
    const { targetId, offer } = data;
    const targetWs = connections.get(targetId);
    
    if (targetWs && targetWs.readyState === 1) {
      targetWs.send(JSON.stringify({
        type: 'offer',
        from: participantId,
        offer
      }));
      logger.debug(`Offer relayed [${correlationId}]: ${participantId} -> ${targetId}`);
    }
  }
  
  function handleAnswer(ws, data, correlationId) {
    const { targetId, answer } = data;
    const targetWs = connections.get(targetId);
    
    if (targetWs && targetWs.readyState === 1) {
      targetWs.send(JSON.stringify({
        type: 'answer',
        from: participantId,
        answer
      }));
      logger.debug(`Answer relayed [${correlationId}]: ${participantId} -> ${targetId}`);
    }
  }
  
  function handleIceCandidate(ws, data, correlationId) {
    const { targetId, candidate } = data;
    const targetWs = connections.get(targetId);
    
    if (targetWs && targetWs.readyState === 1) {
      targetWs.send(JSON.stringify({
        type: 'ice-candidate',
        from: participantId,
        candidate
      }));
      logger.debug(`ICE candidate relayed [${correlationId}]: ${participantId} -> ${targetId}`);
    }
  }
  
  async function handleLeave(ws, correlationId) {
    if (!participantId || !roomId) return;
    
    try {
      // Update participant record (optional)
      try {
        await Participant.findOneAndUpdate(
          { participantId },
          { leftAt: new Date(), isActive: false }
        );
      } catch (error) {
        logger.debug('Could not update participant in MongoDB');
      }
      
      // Update call stat (optional)
      try {
        const callStat = await CallStat.findOne({ participantId });
        if (callStat && !callStat.leaveTime) {
          const duration = Math.floor((Date.now() - callStat.joinTime) / 1000);
          await CallStat.findOneAndUpdate(
            { participantId },
            { leaveTime: new Date(), duration }
          );
        }
      } catch (error) {
        logger.debug('Could not update call stat in MongoDB');
      }
      
      // Remove from room
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(participantId);
      }
      connections.delete(participantId);
      
      // Notify others
      broadcastToRoom(roomId, ws, {
        type: 'user-left',
        participantId
      });
      
      logger.info(`User left [${correlationId}]: ${participantId}`);
    } catch (error) {
      logger.error(`Error handling leave [${correlationId}]:`, error);
    }
  }
  
  function handleToggleAudio(ws, data, correlationId) {
    if (rooms.has(roomId)) {
      const participant = rooms.get(roomId).get(participantId);
      if (participant) {
        participant.isAudioEnabled = data.enabled;
        broadcastToRoom(roomId, ws, {
          type: 'audio-toggled',
          participantId,
          enabled: data.enabled
        });
      }
    }
  }
  
  function handleToggleVideo(ws, data, correlationId) {
    if (rooms.has(roomId)) {
      const participant = rooms.get(roomId).get(participantId);
      if (participant) {
        participant.isVideoEnabled = data.enabled;
        broadcastToRoom(roomId, ws, {
          type: 'video-toggled',
          participantId,
          enabled: data.enabled
        });
      }
    }
  }
  
  function handleChat(ws, data, correlationId) {
    broadcastToRoom(roomId, ws, {
      type: 'chat',
      participantId,
      displayName,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  }
  
  function handleTyping(ws, data, correlationId) {
    broadcastToRoom(roomId, ws, {
      type: 'typing',
      participantId,
      displayName,
      isTyping: data.isTyping
    });
  }
  
  function broadcastToRoom(roomId, excludeWs, message) {
    if (!rooms.has(roomId)) return;
    
    const roomParticipants = Array.from(rooms.get(roomId).keys())
      .map(id => connections.get(id))
      .filter(conn => conn && conn !== excludeWs && conn.readyState === 1);
    
    roomParticipants.forEach(conn => {
      conn.send(JSON.stringify(message));
    });
  }
}
