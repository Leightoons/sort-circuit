const { getModel, generateRoomCode } = require('./config/db');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const { startRace, getRaceStatus, stopRace } = require('./controllers/race');

// Store active socket connections by user
const activeConnections = new Map();

// Store usernames by socket ID
const socketUsernames = new Map();

// Authenticate socket connection
const authenticateSocket = async (socket, next) => {
  // With username-based auth, we just need a username
  if (socket.handshake.auth.username) {
    socket.username = socket.handshake.auth.username;
    socketUsernames.set(socket.id, socket.username);
    return next();
  }
  
  // If no username, generate a temporary one
  socket.username = `Player_${socket.id.substring(0, 6)}`;
  socketUsernames.set(socket.id, socket.username);
  next();
};

const registerSocketHandlers = (io) => {
  // Set up authentication middleware
  io.use(authenticateSocket);
  
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id, socket.username);
    
    // Handle room joining
    socket.on('join_room', async ({ roomCode, username }) => {
      try {
        // Validate input
        if (!roomCode || !roomCode.trim()) {
          socket.emit('room_error', { message: 'Room code is required' });
          return;
        }

        // Update username if provided
        if (username) {
          socket.username = username;
          socketUsernames.set(socket.id, username);
        }
        
        const Room = getModel('Room');
        const room = await Room.findOne({ code: roomCode });
        
        if (!room) {
          socket.emit('room_error', { message: 'Room not found with code: ' + roomCode });
          return;
        }
        
        // Join the socket to the room
        socket.join(roomCode);
        
        // Add player to room if not already present
        const player = {
          socketId: socket.id,
          username: socket.username
        };
        
        // Send room joined confirmation
        socket.emit('room_joined', { roomCode });
        
        // Get all players currently in the socket room
        const socketsInRoom = await io.in(roomCode).fetchSockets();
        const players = socketsInRoom.map(s => ({
          socketId: s.id,
          username: socketUsernames.get(s.id) || `Player_${s.id.substring(0, 6)}`
        }));
        
        // Notify players in the room
        io.to(roomCode).emit('room_players', { players });
        
        // Notify other users in the room about the new user
        socket.to(roomCode).emit('user_joined', player);
        
        // Send current race status if race is in progress
        const raceStatus = getRaceStatus(roomCode);
        if (raceStatus.exists) {
          socket.emit('race_status', raceStatus);
        } else {
          // Send current algorithms
          socket.emit('algorithms_updated', {
            roomCode,
            algorithms: room.algorithms
          });
          
          // Send current settings
          socket.emit('settings_updated', {
            roomCode,
            settings: {
              datasetSize: room.datasetSize,
              allowDuplicates: room.allowDuplicates,
              valueRange: room.valueRange,
              stepSpeed: room.stepSpeed
            }
          });
        }
        
        console.log(`User ${socket.username} (${socket.id}) joined room ${roomCode}`);
        
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('room_error', { message: 'Server error when joining room: ' + error.message });
      }
    });
    
    // Handle room creation
    socket.on('create_room', async ({ algorithms = ['bubble', 'quick', 'merge'], username }) => {
      try {
        // Validate algorithms
        if (!algorithms || !Array.isArray(algorithms) || algorithms.length < 2) {
          socket.emit('room_error', { message: 'Must select at least 2 algorithms' });
          return;
        }
        
        // Update username if provided
        if (username) {
          socket.username = username;
          socketUsernames.set(socket.id, username);
        }
        
        // Generate a unique room code
        let code;
        let isUnique = false;
  
        while (!isUnique) {
          code = generateRoomCode();
          const Room = getModel('Room');
          const existingRoom = await Room.findOne({ code });
          isUnique = !existingRoom;
        }
  
        // Create room with selected algorithms
        const Room = getModel('Room');
        const room = await Room.create({
          code,
          host: socket.id,
          hostUsername: socket.username,
          players: [],
          algorithms: algorithms
        });
  
        // Join the socket to the room
        socket.join(code);
        
        socket.emit('room_created', { 
          roomCode: code,
          isHost: true
        });
        
        // Add player to room
        const player = {
          socketId: socket.id,
          username: socket.username
        };
        
        // Emit room players update
        io.to(code).emit('room_players', { 
          players: [player]
        });
        
        // Send algorithms to client
        socket.emit('algorithms_updated', {
          roomCode: code,
          algorithms
        });
        
        console.log(`User ${socket.username} (${socket.id}) created room ${code}`);
        
      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('room_error', { message: 'Server error when creating room: ' + error.message });
      }
    });
    
    // Handle algorithm selection
    socket.on('select_algorithm', async ({ roomCode, algorithms }) => {
      try {
        const Room = getModel('Room');
        const room = await Room.findOne({ code: roomCode });
        
        if (!room) {
          socket.emit('room_error', { message: 'Room not found' });
          return;
        }
        
        // Check if user is the host
        if (room.host !== socket.id) {
          socket.emit('room_error', { message: 'Only host can select algorithms' });
          return;
        }
        
        // Check if room is not racing
        if (room.status === 'racing') {
          socket.emit('room_error', { message: 'Cannot change algorithms during a race' });
          return;
        }
        
        // Validate algorithms (must have at least 2)
        if (!algorithms || !Array.isArray(algorithms) || algorithms.length < 2) {
          socket.emit('room_error', { message: 'Must select at least 2 algorithms' });
          return;
        }
        
        // Validate algorithm types
        const validAlgorithms = ['bubble', 'quick', 'merge', 'insertion', 'selection'];
        if (!algorithms.every(algo => validAlgorithms.includes(algo))) {
          socket.emit('room_error', { message: 'Invalid algorithm selection' });
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
        const Room = getModel('Room');
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
        
        // Broadcast bet to all users in the room
        io.to(roomCode).emit('bet_placed', {
          socketId: socket.id,
          username: socket.username,
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
        const Room = getModel('Room');
        const room = await Room.findOne({ code: roomCode });
        
        if (!room) {
          socket.emit('race_error', { message: 'Room not found' });
          return;
        }
        
        // Check if user is the host
        if (room.host !== socket.id) {
          socket.emit('race_error', { message: 'Only host can start the race' });
          return;
        }
        
        // Update room status
        room.status = 'racing';
        await room.save();
        
        // Start race
        await startRace(io, socket, roomCode, room);
      } catch (error) {
        console.error('Error starting race:', error);
        socket.emit('race_error', { message: 'Server error' });
      }
    });
    
    // Handle room settings update
    socket.on('update_settings', async ({ roomCode, settings }) => {
      try {
        const Room = getModel('Room');
        const room = await Room.findOne({ code: roomCode });
        
        if (!room) {
          socket.emit('room_error', { message: 'Room not found' });
          return;
        }
        
        // Check if user is the host
        if (room.host !== socket.id) {
          socket.emit('room_error', { message: 'Only host can update settings' });
          return;
        }
        
        // Check if room is not racing
        if (room.status === 'racing') {
          socket.emit('room_error', { message: 'Cannot change settings during a race' });
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
          socketId: socket.id,
          username: socket.username
        });
        
        // If host is leaving, assign new host or close room
        const Room = getModel('Room');
        const room = await Room.findOne({ code: roomCode });
        if (room && room.host === socket.id) {
          // Get all sockets in the room
          const socketsInRoom = await io.in(roomCode).fetchSockets();
          
          if (socketsInRoom.length > 0) {
            // Assign a new host
            const newHostSocket = socketsInRoom[0];
            room.host = newHostSocket.id;
            room.hostUsername = socketUsernames.get(newHostSocket.id) || 'New Host';
            await room.save();
            
            // Notify the new host
            io.to(newHostSocket.id).emit('host_assigned', { roomCode });
            
            // Notify all users in the room about the new host
            io.to(roomCode).emit('host_changed', {
              socketId: newHostSocket.id,
              username: socketUsernames.get(newHostSocket.id) || 'New Host'
            });
          } else {
            // No users left, delete the room
            await Room.findOneAndDelete({ code: roomCode });
            
            // Clean up any active races
            stopRace(roomCode);
          }
        }
        
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      
      try {
        // Find any rooms where this socket is a member
        const Room = getModel('Room');
        const rooms = await Room.find({ host: socket.id });
        
        for (const room of rooms) {
          // Get all sockets in the room
          const socketsInRoom = await io.in(room.code).fetchSockets();
          
          if (socketsInRoom.length > 0) {
            // Assign a new host
            const newHostSocket = socketsInRoom[0];
            room.host = newHostSocket.id;
            room.hostUsername = socketUsernames.get(newHostSocket.id) || 'New Host';
            await room.save();
            
            // Notify the new host
            io.to(newHostSocket.id).emit('host_assigned', { roomCode: room.code });
            
            // Notify all users in the room about the new host
            io.to(room.code).emit('host_changed', {
              socketId: newHostSocket.id,
              username: socketUsernames.get(newHostSocket.id) || 'New Host'
            });
          } else {
            // No users left, delete the room
            await Room.findOneAndDelete({ _id: room._id });
            
            // Clean up any active races
            stopRace(room.code);
          }
        }
        
        // Notify all rooms this socket was in about the disconnect
        const joinedRooms = Array.from(socket.rooms);
        for (const roomId of joinedRooms) {
          if (roomId !== socket.id) { // Skip the default room (socket.id)
            io.to(roomId).emit('user_left', {
              socketId: socket.id,
              username: socketUsernames.get(socket.id) || 'Unknown User'
            });
          }
        }
        
        // Remove from username map
        socketUsernames.delete(socket.id);
      } catch (error) {
        console.error('Error handling disconnection:', error);
      }
    });
  });
};

module.exports = {
  registerSocketHandlers
}; 