import mongoose from 'mongoose';

const callStatSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  participantId: {
    type: String,
    required: true
  },
  joinTime: {
    type: Date,
    required: true
  },
  leaveTime: {
    type: Date
  },
  duration: {
    type: Number // in seconds
  },
  bitrate: {
    video: Number,
    audio: Number
  },
  packetLoss: {
    type: Number
  }
});

export const CallStat = mongoose.model('CallStat', callStatSchema);
