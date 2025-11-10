import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

export const authenticateSocket = (ws, req) => {
  try {
    const token = req.url?.split('token=')[1];
    
    if (!token) {
      logger.warn('No token provided');
      return null;
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    return decoded;
  } catch (error) {
    logger.warn('Authentication failed:', error.message);
    return null;
  }
};

export const generateToken = (userId, roomId) => {
  return jwt.sign(
    { userId, roomId },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};
