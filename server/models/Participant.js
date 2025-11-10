import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  participantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  roomId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  leftAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

export const Participant = mongoose.model('Participant', participantSchema);
