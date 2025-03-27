const Room = require('./models/Room');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const { startRace, getRaceStatus, stopRace } = require('./controllers/race');

// Store active socket connections by user
const activeConnections = new Map();

// Authenticate socket connection using JWT
const authenticateSocket = async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user._id.toString();
    
    // Add to active connections
    if (!activeConnections.has(user._id.toString())) {
      activeConnections.set(user._id.toString(), new Set());
    }
    activeConnections.get(user._id.toString()).add(socket.id);
    
    next();
  } catch (error) {
    return next(new Error('Authentication error'));
  }
};

const registerSocketHandlers = (io) => {
  // Set up authentication middleware
  io.use(authenticateSocket);
  
  io.on('connection', (socket) => {
    console.log('New authenticated client connected:', socket.id, socket.userId);
    
    // Handle room joining
    socket.on('join_room', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ code: roomCode });
        
        if (!room) {
          socket.emit('room_error', { message: 'Room not found' });
          return;
        }
        
        // Check if user is in the room's player list
        const isPlayerInRoom = room.players.some(
          player => player.toString() === socket.userId
        );
        
        if (!isPlayerInRoom) {
          socket.emit('room_error', { message: 'You are not a player in this room' });
          return;
        }
        
        // Join the socket to the room
        socket.join(roomCode);
        
        socket.emit('room_joined', { roomCode });
        
        // Notify other users in the room
        socket.to(roomCode).emit('user_joined', {
          userId: socket.userId,
          username: socket.user.username
        });
        
        // Send current race status if race is in progress
        const raceStatus = getRaceStatus(roomCode);
        if (raceStatus.exists) {
          socket.emit('race_status', raceStatus);
        }
        
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('room_error', { message: 'Server error' });
      }
    });
    
    // Handle room creation
    socket.on('create_room', async (data) => {
      try {
        // Generate a unique room code
        let code;
        let isUnique = false;
  
        while (!isUnique) {
          code = Room.generateRoomCode();
          const existingRoom = await Room.findOne({ code });
          isUnique = !existingRoom;
        }
  
        // Create room with default algorithms selected
        const room = await Room.create({
          code,
          host: socket.userId,
          players: [socket.userId],
          algorithms: data.algorithms || ['bubble', 'quick', 'merge']
        });
  
        // Join the socket to the room
        socket.join(code);
        
        socket.emit('room_created', { 
          roomCode: code,
          isHost: true
        });
        
      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('room_error', { message: 'Server error' });
      }
    });
    
    // Handle algorithm selection
    socket.on('select_algorithm', async ({ roomCode, algorithms }) => {
      try {
        const room = await Room.findOne({ code: roomCode });
        
        if (!room) {
          socket.emit('room_error', { message: 'Room not found' });
          return;
        }
        
        // Check if user is the host
        if (room.host.toString() !== socket.userId) {
          socket.emit('room_error', { message: 'Only host can select algorithms' });
          return;
        }
        
        // Update algorithms
        room.algorithms = algorithms;
        await room.save();
        
        // Broadcast update to all users in the room
        io.to(roomCode).emit('algorithms_updated', {
          roomCode,
          algorithms
        });
        
      } catch (error) {
        console.error('Error selecting algorithms:', error);
        socket.emit('room_error', { message: 'Server error' });
      }
    });
    
    // Handle user betting
    socket.on('place_bet', async ({ roomCode, algorithm }) => {
      try {
        const room = await Room.findOne({ code: roomCode });
        
        if (!room) {
          socket.emit('bet_error', { message: 'Room not found' });
          return;
        }
        
        // Check if algorithm is valid
        if (!room.algorithms.includes(algorithm)) {
          socket.emit('bet_error', { message: 'Invalid algorithm' });
          return;
        }
        
        // Check if race already started
        if (room.status !== 'waiting') {
          socket.emit('bet_error', { message: 'Cannot place bet after race has started' });
          return;
        }
        
        // Store bet (handled by bet controller through socket.request)
        socket.request = { user: socket.user, params: { code: roomCode }, body: { algorithm } };
        
        // Broadcast bet to all users in the room
        io.to(roomCode).emit('bet_placed', {
          userId: socket.userId,
          username: socket.user.username,
          algorithm
        });
        
        socket.emit('bet_confirmed', { algorithm });
        
      } catch (error) {
        console.error('Error placing bet:', error);
        socket.emit('bet_error', { message: 'Server error' });
      }
    });
    
    // Handle race start
    socket.on('start_race', async ({ roomCode }) => {
      try {
        await startRace(io, socket, roomCode);
      } catch (error) {
        console.error('Error starting race:', error);
        socket.emit('race_error', { message: 'Server error' });
      }
    });
    
    // Handle room settings update
    socket.on('update_settings', async ({ roomCode, settings }) => {
      try {
        const room = await Room.findOne({ code: roomCode });
        
        if (!room) {
          socket.emit('room_error', { message: 'Room not found' });
          return;
        }
        
        // Check if user is the host
        if (room.host.toString() !== socket.userId) {
          socket.emit('room_error', { message: 'Only host can update settings' });
          return;
        }
        
        // Update allowed fields
        const allowedUpdates = ['datasetSize', 'allowDuplicates', 'valueRange', 'stepSpeed'];
        
        for (const field of allowedUpdates) {
          if (settings[field] !== undefined) {
            room[field] = settings[field];
          }
        }
        
        await room.save();
        
        // Broadcast update to all users in the room
        io.to(roomCode).emit('settings_updated', {
          roomCode,
          settings: {
            datasetSize: room.datasetSize,
            allowDuplicates: room.allowDuplicates,
            valueRange: room.valueRange,
            stepSpeed: room.stepSpeed
          }
        });
        
      } catch (error) {
        console.error('Error updating settings:', error);
        socket.emit('room_error', { message: 'Server error' });
      }
    });
    
    // Handle room leave
    socket.on('leave_room', async ({ roomCode }) => {
      try {
        socket.leave(roomCode);
        
        // Notify other users in the room
        socket.to(roomCode).emit('user_left', {
          userId: socket.userId,
          username: socket.user.username
        });
        
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Remove from active connections
      if (socket.userId && activeConnections.has(socket.userId)) {
        const userSockets = activeConnections.get(socket.userId);
        userSockets.delete(socket.id);
        
        if (userSockets.size === 0) {
          activeConnections.delete(socket.userId);
        }
      }
    });
  });
};

module.exports = {
  registerSocketHandlers
}; 