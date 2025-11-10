// Seed script for MongoDB
import mongoose from 'mongoose';
import { Room } from '../server/models/Room.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/webrtc-conferencing';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create sample rooms
    const sampleRooms = [
      {
        roomId: 'demo-room-1',
        name: 'Demo Room 1',
        createdBy: 'System',
        createdAt: new Date()
      },
      {
        roomId: 'demo-room-2',
        name: 'Demo Room 2',
        createdBy: 'System',
        createdAt: new Date()
      }
    ];

    await Room.deleteMany({});
    await Room.insertMany(sampleRooms);

    console.log('✅ Seeded sample rooms:');
    sampleRooms.forEach(room => {
      console.log(`   - ${room.name} (ID: ${room.roomId})`);
    });

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
}

seed();
