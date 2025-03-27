const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: [6, 'Room code cannot be more than 6 characters']
  },
  host: {
    type: String,
    required: true
  },
  hostUsername: {
    type: String,
    required: true
  },
  players: [{
    socketId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['waiting', 'racing', 'finished'],
    default: 'waiting'
  },
  algorithms: [{
    type: String,
    enum: ['bubble', 'quick', 'merge', 'insertion', 'selection'],
    required: true
  }],
  datasetSize: {
    type: Number,
    default: 20,
    min: [5, 'Dataset size must be at least 5'],
    max: [100, 'Dataset size cannot exceed 100']
  },
  allowDuplicates: {
    type: Boolean,
    default: false
  },
  valueRange: {
    min: {
      type: Number,
      default: 1
    },
    max: {
      type: Number,
      default: 100
    }
  },
  stepSpeed: {
    type: Number,
    default: 500, // milliseconds
    min: [100, 'Step speed cannot be less than 100ms'],
    max: [2000, 'Step speed cannot exceed 2000ms']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate a random 6-character room code
RoomSchema.statics.generateRoomCode = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return code;
};

module.exports = mongoose.model('Room', RoomSchema); 