// In-memory database implementation
const db = {
  rooms: new Map()
};

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
    Object.assign(this, data);
    this.status = this.status || 'waiting';
    this.datasetSize = this.datasetSize || 20;
    this.allowDuplicates = this.allowDuplicates || false;
    this.valueRange = this.valueRange || { min: 1, max: 100 };
    this.stepSpeed = this.stepSpeed || 500;
    this.createdAt = this.createdAt || new Date();
    
    if (!this._id) {
      this._id = Date.now().toString();
    }
  }
  
  static findOne(query) {
    if (query.code) {
      return Promise.resolve(db.rooms.get(query.code) || null);
    }
    return Promise.resolve(null);
  }

  static create(data) {
    const room = new Room(data);
    db.rooms.set(data.code, room);
    return Promise.resolve(room);
  }

  save() {
    db.rooms.set(this.code, this);
    return Promise.resolve(this);
  }
  
  static findById(id) {
    for (const [code, room] of db.rooms.entries()) {
      if (room._id === id) {
        return Promise.resolve(room);
      }
    }
    return Promise.resolve(null);
  }
  
  static findOneAndDelete(query) {
    if (query.code) {
      const room = db.rooms.get(query.code);
      if (room) {
        db.rooms.delete(query.code);
        return Promise.resolve(room);
      }
    } else if (query._id) {
      for (const [code, room] of db.rooms.entries()) {
        if (room._id === query._id) {
          db.rooms.delete(code);
          return Promise.resolve(room);
        }
      }
    }
    return Promise.resolve(null);
  }
  
  static find(query = {}) {
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
    
    return Promise.resolve(results);
  }
}

// Simple initialization function (no actual database to connect to)
const initializeDatabase = () => {
  console.log('In-memory database initialized');
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