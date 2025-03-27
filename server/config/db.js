const mongoose = require('mongoose');

// Mock database in-memory when MongoDB is not available
const mockDB = {
  rooms: new Map(),
  users: new Map()
};

let useMockDB = false;

// Generate a random room code for mock DB
const generateRoomCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

// Generate a random dataset for sorting algorithms
const generateDataset = (size = 20, min = 1, max = 100, allowDuplicates = false) => {
  const dataset = [];
  const range = max - min + 1;
  
  if (allowDuplicates) {
    for (let i = 0; i < size; i++) {
      dataset.push(Math.floor(Math.random() * range) + min);
    }
  } else {
    // Ensure unique values by creating array with all possible values and shuffling
    if (range < size) {
      throw new Error('Range must be at least as large as the dataset size when duplicates are not allowed');
    }
    
    const allValues = [];
    for (let i = min; i <= max; i++) {
      allValues.push(i);
    }
    
    // Fisher-Yates shuffle
    for (let i = allValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allValues[i], allValues[j]] = [allValues[j], allValues[i]];
    }
    
    // Take first 'size' elements
    for (let i = 0; i < size; i++) {
      dataset.push(allValues[i]);
    }
  }
  
  return dataset;
};

// Mock model for Room
class MockRoom {
  constructor(data) {
    Object.assign(this, data);
    this.status = 'waiting';
    this.datasetSize = 20;
    this.allowDuplicates = false;
    this.valueRange = { min: 1, max: 100 };
    this.stepSpeed = 500;
    
    if (!this._id) {
      this._id = Date.now().toString();
    }
  }
  
  static findOne(query) {
    if (query.code) {
      return Promise.resolve(mockDB.rooms.get(query.code) || null);
    }
    return Promise.resolve(null);
  }

  static create(data) {
    const room = new MockRoom(data);
    mockDB.rooms.set(data.code, room);
    return Promise.resolve(room);
  }

  save() {
    mockDB.rooms.set(this.code, this);
    return Promise.resolve(this);
  }
  
  static findById(id) {
    for (const [code, room] of mockDB.rooms.entries()) {
      if (room._id === id) {
        return Promise.resolve(room);
      }
    }
    return Promise.resolve(null);
  }
  
  static findOneAndDelete(query) {
    if (query.code) {
      const room = mockDB.rooms.get(query.code);
      if (room) {
        mockDB.rooms.delete(query.code);
        return Promise.resolve(room);
      }
    }
    return Promise.resolve(null);
  }
  
  static find(query) {
    const results = [];
    for (const [code, room] of mockDB.rooms.entries()) {
      if (query.host && room.host === query.host) {
        results.push(room);
      }
    }
    return Promise.resolve(results);
  }
}

const connectDB = async () => {
  try {
    // Check if MONGO_URI is set in environment variables
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI not set, using in-memory mock database');
      useMockDB = true;
      return;
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`MongoDB Connection Error: ${error.message}`);
    console.warn('Using in-memory mock database instead');
    useMockDB = true;
  }
};

// Get the appropriate Room model (real or mock)
const getModel = (modelName) => {
  if (useMockDB) {
    if (modelName === 'Room') {
      return MockRoom;
    }
    throw new Error(`Mock model ${modelName} not implemented`);
  }
  return mongoose.model(modelName);
};

module.exports = {
  connectDB,
  getModel,
  generateRoomCode,
  generateDataset
}; 