// In-memory database implementation
const db = {
  rooms: new Map()
};

// For debug purposes
global.getInMemoryDB = () => db;

// Generate a random room code
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

// Room model implementation
class Room {
  constructor(data) {
    // Set default values
    this._id = Date.now().toString();
    this.status = 'waiting';
    this.datasetSize = 20;
    this.allowDuplicates = false;
    this.valueRange = { min: 1, max: 100 };
    this.stepSpeed = 250;
    this.createdAt = new Date();
    this.players = [];
    this.pendingDeletion = false;
    this.deletionTimestamp = null;
    
    // Apply supplied data over defaults
    Object.assign(this, data);
    
    // Ensure the code is always set and accessible
    if (!this.code) {
      throw new Error('Room code is required');
    }
    
    console.log(`[Room] Created room object with code: ${this.code}`);
  }
  
  static async findOne(query) {
    if (!query || !query.code) {
      console.log('[DB] findOne called with invalid query');
      return null;
    }
    
    const roomCode = query.code.toUpperCase();
    const room = db.rooms.get(roomCode);
    
    console.log(`[DB] findOne for room code: ${roomCode}, found: ${room !== null && room !== undefined}`);
    console.log(`[DB] All rooms: ${JSON.stringify(Array.from(db.rooms.keys()))}`);
    
    if (room) {
      console.log(`[DB] Found room: ${roomCode}`);
    } else {
      console.log(`[DB] Room not found: ${roomCode}`);
    }
    
    return room;
  }

  static async create(data) {
    if (!data || !data.code) {
      throw new Error('Room code is required');
    }
    
    // Ensure code is uppercase
    const roomCode = data.code.toUpperCase();
    data.code = roomCode;
    
    // Create new room
    const room = new Room(data);
    
    // Store in database
    db.rooms.set(roomCode, room);
    
    console.log(`[DB] Created room: ${roomCode}`);
    console.log(`[DB] All rooms: ${JSON.stringify(Array.from(db.rooms.keys()))}`);
    
    return room;
  }

  async save() {
    if (!this.code) {
      throw new Error('Room code is required');
    }
    
    // Ensure code is uppercase
    const roomCode = this.code.toUpperCase();
    this.code = roomCode;
    
    // Store in database
    db.rooms.set(roomCode, this);
    
    console.log(`[DB] Saved room: ${roomCode}`);
    return this;
  }
  
  static async findById(id) {
    for (const [code, room] of db.rooms.entries()) {
      if (room._id === id) {
        return room;
      }
    }
    return null;
  }
  
  static async findOneAndDelete(query) {
    if (query.code) {
      const roomCode = query.code.toUpperCase();
      const room = db.rooms.get(roomCode);
      
      if (room) {
        db.rooms.delete(roomCode);
        console.log(`[DB] Deleted room: ${roomCode}`);
        return room;
      }
    } else if (query._id) {
      for (const [code, room] of db.rooms.entries()) {
        if (room._id === query._id) {
          db.rooms.delete(code);
          console.log(`[DB] Deleted room with ID: ${query._id}`);
          return room;
        }
      }
    }
    return null;
  }
  
  static async find(query = {}) {
    const results = [];
    
    for (const [code, room] of db.rooms.entries()) {
      let match = true;
      
      // Match all properties in the query
      for (const [key, value] of Object.entries(query)) {
        if (room[key] !== value) {
          match = false;
          break;
        }
      }
      
      if (match) {
        results.push(room);
      }
    }
    
    return results;
  }
}

// Initialize database and create test rooms if needed
const initializeDatabase = async () => {
  console.log('In-memory database initialized');
  
  // Create a test room for debugging
  if (process.env.NODE_ENV === 'development') {
    try {
      const testRoomCode = 'TEST01';
      if (!db.rooms.has(testRoomCode)) {
        await Room.create({
          code: testRoomCode,
          host: 'test-host-id',
          hostUsername: 'TestHost',
          algorithms: ['bubble', 'quick', 'inplacestable'],
        });
        console.log(`[DB] Created test room: ${testRoomCode}`);
      }
    } catch (err) {
      console.error('[DB] Error creating test room:', err);
    }
  }
  
  return Promise.resolve();
};

// Get the appropriate model
const getModel = (modelName) => {
  if (modelName === 'Room') {
    return Room;
  }
  throw new Error(`Model ${modelName} not implemented`);
};

module.exports = {
  initializeDatabase,
  getModel,
  generateRoomCode,
  generateDataset
}; 