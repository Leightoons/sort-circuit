const { getModel, generateRoomCode } = require('./config/db');
const { startRace, getRaceStatus, stopRace, placeBet, updateRaceStepSpeed, endRaceEarly } = require('./controllers/race');
const { getAllBetsForRoom, clearRoomBets } = require('./controllers/bets');

// Store active socket connections by user
const activeConnections = new Map();

// Store last heartbeat time for each socket
const lastHeartbeats = new Map();

// Store usernames by socket ID
const socketUsernames = new Map();

// Heartbeat configuration
const HEARTBEAT_PING_INTERVAL = 15000; // 15 seconds (client ping interval)
const HEARTBEAT_CHECK_INTERVAL = 30000; // 30 seconds (server check interval)
const HEARTBEAT_TIMEOUT = 120000; // 120 seconds (timeout for inactive sockets)

// Helper function to normalize username (trim and convert to lowercase for comparison)
const normalizeUsername = (username) => {
  if (!username) return '';
  return username.trim().toLowerCase();
};

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
  
  // Setup heartbeat interval to check for stale connections
  setInterval(async () => {
    const now = Date.now();
    
    // Debug: Print all tracked heartbeats
    console.log(`[HEARTBEAT] Checking ${lastHeartbeats.size} tracked connections`);
    
    // Check for stale connections
    for (const [socketId, lastHeartbeat] of lastHeartbeats.entries()) {
      const timeSinceLastHeartbeat = now - lastHeartbeat;
      
      // Skip if we have a recent heartbeat
      if (timeSinceLastHeartbeat < HEARTBEAT_TIMEOUT) {
        continue;
      }
      
      console.log(`[HEARTBEAT] Socket ${socketId} hasn't sent a heartbeat in ${timeSinceLastHeartbeat}ms (timeout: ${HEARTBEAT_TIMEOUT}ms)`);
      
      // Get socket instance if it exists
      try {
        // First check if socket is still connected to a room
        const username = socketUsernames.get(socketId) || 'Unknown';
        console.log(`[HEARTBEAT] Checking if ${username} (${socketId}) is still connected`);
        
        // Try to get the socket from the server
        const socket = io.sockets.sockets.get(socketId);
        
        if (!socket) {
          console.log(`[HEARTBEAT] Socket ${socketId} not found in io.sockets, cleaning up tracking data`);
          // Socket not found, remove from our tracking
          lastHeartbeats.delete(socketId);
          // Don't remove username here, let the disconnect handler handle it
          continue;
        }
        
        // Check if socket is actually connected
        if (!socket.connected) {
          console.log(`[HEARTBEAT] Socket ${socketId} exists but is not connected, cleaning up`);
          lastHeartbeats.delete(socketId);
          continue; 
        }
        
        // At this point, the socket exists but hasn't sent a heartbeat in too long
        console.log(`[HEARTBEAT] Socket ${socketId} hasn't sent a heartbeat in ${timeSinceLastHeartbeat}ms`);
        
        // Check if this socket is a host in any room before disconnecting
        const Room = getModel('Room');
        const hostingRooms = await Room.find({ host: socketId });
        
        if (hostingRooms.length > 0) {
          console.log(`[HEARTBEAT] Socket ${socketId} is hosting ${hostingRooms.length} rooms, delaying timeout`);
          
          // Reset heartbeat to delay timeout for hosts
          lastHeartbeats.set(socketId, now - (HEARTBEAT_TIMEOUT / 2));
          continue;
        }
        
        console.log(`[HEARTBEAT] Force disconnecting socket ${socketId} (${username})`);
        
        // Save the notification data before disconnecting
        const disconnectData = {
          socketId,
          username: socketUsernames.get(socketId)
        };
        
        // Disconnect the socket
        socket.disconnect(true);
        
        // Socket disconnection should trigger the disconnect event and cleanup
      } catch (error) {
        console.error(`[HEARTBEAT] Error handling stale connection for ${socketId}:`, error);
        // Safety cleanup for this socket's tracking data
        lastHeartbeats.delete(socketId);
      }
    }
  }, HEARTBEAT_CHECK_INTERVAL);
  
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id, socket.username);
    
    // Track active connection
    activeConnections.set(socket.id, {
      username: socket.username,
      connectedAt: Date.now()
    });
    
    // Initialize heartbeat tracking
    lastHeartbeats.set(socket.id, Date.now());
    console.log(`[HEARTBEAT] Initialized tracking for ${socket.id} (${socket.username})`);
    
    // Handle heartbeat ping
    socket.on('heartbeat', () => {
      const now = Date.now();
      const lastBeat = lastHeartbeats.get(socket.id) || 0;
      const elapsed = now - lastBeat;
      
      // Only log occasional heartbeats to avoid log spam
      if (elapsed > HEARTBEAT_PING_INTERVAL * 2) {
        console.log(`[HEARTBEAT] Received from ${socket.id} (${socket.username}) after ${elapsed}ms`);
      }
      
      lastHeartbeats.set(socket.id, now);
      
      // Use setTimeout to avoid potential ACK conflicts
      setTimeout(() => {
        // Only send acknowledgment if socket is still connected
        if (socket.connected) {
          socket.emit('heartbeat_ack');
        }
      }, 10);
    });
    
    // Handle room joining
    socket.on('join_room', async ({ roomCode, username }) => {
      try {
        console.log(`[JOIN] Attempting to join room: ${roomCode} with username: ${username}`);
        
        // Validate input
        if (!roomCode || !roomCode.trim()) {
          console.log(`[JOIN] Error: Room code is required`);
          socket.emit('room_error', { message: 'Room code is required' });
          return;
        }

        // Validate username
        if (!username || !username.trim()) {
          console.log(`[JOIN] Error: Username is required`);
          socket.emit('room_error', { message: 'Username is required' });
          return;
        }

        // Normalize room code to uppercase
        const normalizedRoomCode = roomCode.trim().toUpperCase();
        console.log(`[JOIN] Normalized room code: ${normalizedRoomCode}`);
        
        // Update username if provided
        const trimmedUsername = username.trim();
        socket.username = trimmedUsername;
        socketUsernames.set(socket.id, trimmedUsername);
        console.log(`[JOIN] Updated username to: ${trimmedUsername} for socket: ${socket.id}`);
        
        const Room = getModel('Room');
        console.log(`[JOIN] Looking for room with code: ${normalizedRoomCode}`);
        
        // Debug - dump all rooms
        console.log(`[JOIN] Available rooms: ${JSON.stringify(Array.from(global.getInMemoryDB().rooms.keys()))}`);
        
        const room = await Room.findOne({ code: normalizedRoomCode });
        
        // Check if room exists
        if (!room) {
          console.log(`[JOIN] Error: Room not found with code: ${normalizedRoomCode}`);
          socket.emit('room_error', { message: 'Room not found with code: ' + normalizedRoomCode });
          return;
        }

        // Check if room is already racing and not allowing late joins
        if (room.status === 'racing') {
          console.log(`[JOIN] Error: Room ${normalizedRoomCode} is already racing`);
          socket.emit('room_error', { message: 'This room is already racing. Please wait until the race is finished.' });
          return;
        }

        // Check if room is at capacity (optional: can implement a max player limit)
        const MAX_PLAYERS = 10; // Set a reasonable maximum
        if (room.players.length >= MAX_PLAYERS) {
          console.log(`[JOIN] Error: Room ${normalizedRoomCode} is at max capacity (${MAX_PLAYERS} players)`);
          socket.emit('room_error', { message: `This room is full (maximum ${MAX_PLAYERS} players)` });
          return;
        }

        // Check for duplicate username in this room
        const normalizedInputUsername = normalizeUsername(trimmedUsername);
        const duplicateUser = room.players.find(p => 
          normalizeUsername(p.username) === normalizedInputUsername && p.socketId !== socket.id
        );
        
        if (duplicateUser) {
          console.log(`[JOIN] Error: Username ${trimmedUsername} is already taken in room ${normalizedRoomCode}`);
          socket.emit('room_error', { message: `Username "${trimmedUsername}" is already taken in this room` });
          return;
        }
        
        console.log(`[JOIN] Room found, joining socket to room: ${normalizedRoomCode}`);
        // Join the socket to the room
        socket.join(normalizedRoomCode);
        
        // Add player to room if not already present
        const player = {
          socketId: socket.id,
          username: trimmedUsername,
          isHost: socket.id === room.host
        };
        
        // Ensure players array exists and add the player
        if (!room.players) {
          room.players = [];
        }
        
        // Add player to room's player list if not already present
        const playerExists = room.players.some(p => p.socketId === socket.id);
        if (!playerExists) {
          room.players.push(player);
          await room.save();
        }
        
        // Check if the room needs a new host (if current host doesn't exist or is disconnected)
        let isHostUser = socket.id === room.host;
        
        // If not host, check if room has a valid host
        if (!isHostUser) {
          const hostStillExists = room.players.some(p => p.socketId === room.host);
          
          console.log(`[JOIN] Current host: ${room.host}`);
          console.log(`[JOIN] Host exists in player list: ${hostStillExists}`);
          
          // Check if host socket is still active or if there are no players in room
          const connectedSockets = await io.in(normalizedRoomCode).fetchSockets();
          console.log(`[JOIN] Connected sockets: ${connectedSockets.map(s => s.id).join(', ')}`);
          
          // This player should become host if:
          // 1. There's no current host in the players list
          // 2. The host isn't connected to the socket room
          // 3. Room is empty (only this player) - this is the key case we're fixing
          // 4. Host is not in active connections map
          const hostIsConnected = hostStillExists && 
                                 connectedSockets.some(s => s.id === room.host);
          
          console.log(`[JOIN] Host is connected: ${hostIsConnected}`);
          
          // Additional check for stale hosts
          const hostHasActiveConnection = Array.from(activeConnections.keys()).includes(room.host);
          console.log(`[JOIN] Host has active connection: ${hostHasActiveConnection}`);
          
          // Check if room is empty
          const isRoomEmpty = connectedSockets.length <= 1; // Only this player
          console.log(`[JOIN] Room is empty (only joining player): ${isRoomEmpty}`);
          
          if (!hostStillExists || !hostIsConnected || !hostHasActiveConnection || isRoomEmpty) {
            console.log(`[JOIN] Room ${normalizedRoomCode} has no active host. Assigning new host: ${socket.id}`);
            room.host = socket.id;
            room.hostUsername = trimmedUsername;
            isHostUser = true;
            await room.save();
            
            // Update all players' isHost status
            room.players.forEach(p => {
              p.isHost = (p.socketId === socket.id);
            });
            await room.save();
            
            // Notify all users in the room about the new host
            io.to(normalizedRoomCode).emit('host_changed', {
              socketId: socket.id,
              username: trimmedUsername
            });
          }
        }
        
        // Get all players currently in the socket room
        const socketsInRoom = await io.in(normalizedRoomCode).fetchSockets();
        const players = socketsInRoom.map(s => ({
          socketId: s.id,
          username: socketUsernames.get(s.id) || `Player_${s.id.substring(0, 6)}`,
          isHost: s.id === room.host
        }));
        
        console.log(`[JOIN] Players in room: ${JSON.stringify(players)}`);
        console.log(`[JOIN] Room host is: ${room.host}`);
        console.log(`[JOIN] Current socket ID is: ${socket.id}`);
        console.log(`[JOIN] Socket is host: ${socket.id === room.host}`);
        console.log(`[JOIN] isHostUser: ${isHostUser}`);
        
        // Notify players in the room
        io.to(normalizedRoomCode).emit('room_players', { players });
        
        // Send current race status if race is in progress
        const raceStatus = getRaceStatus(normalizedRoomCode);
        if (raceStatus.exists) {
          socket.emit('race_status', raceStatus);
        } else {
          // Send current algorithms
          socket.emit('algorithms_updated', {
            roomCode: normalizedRoomCode,
            algorithms: room.algorithms
          });
          
          // Send current settings
          socket.emit('settings_updated', {
            roomCode: normalizedRoomCode,
            settings: {
              datasetSize: room.datasetSize,
              allowDuplicates: room.allowDuplicates,
              valueRange: room.valueRange,
              stepSpeed: room.stepSpeed
            }
          });
          
          // Send existing bets to the new user
          const existingBets = getAllBetsForRoom(normalizedRoomCode);
          for (const bet of existingBets) {
            socket.emit('bet_placed', {
              socketId: bet.socketId,
              username: bet.username,
              algorithm: bet.algorithm
            });
          }
        }
        
        console.log(`User ${socket.username} (${socket.id}) joined room ${normalizedRoomCode}`);
        
        // Send room joined confirmation
        console.log(`[JOIN] Emitting room_joined event to client with room code: ${normalizedRoomCode}`);
        console.log(`[JOIN] User is host: ${isHostUser}`);
        socket.emit('room_joined', { 
          roomCode: normalizedRoomCode,
          isHost: isHostUser
        });
        
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('room_error', { message: 'Server error when joining room: ' + error.message });
      }
    });
    
    // Handle room creation
    socket.on('create_room', async ({ algorithms = ['bubble', 'quick', 'inplacestable'], username }) => {
      try {
        console.log(`[CREATE] Attempting to create room with algorithms: ${algorithms} and username: ${username}`);
        
        // Validate algorithms
        if (!algorithms || !Array.isArray(algorithms) || algorithms.length < 2) {
          console.log(`[CREATE] Error: Must select at least 2 algorithms`);
          socket.emit('room_error', { message: 'Must select at least 2 algorithms' });
          return;
        }
        
        // Validate username
        if (!username || !username.trim()) {
          console.log(`[CREATE] Error: Username is required`);
          socket.emit('room_error', { message: 'Username is required' });
          return;
        }
        
        // Update username if provided
        const trimmedUsername = username.trim();
        socket.username = trimmedUsername;
        socketUsernames.set(socket.id, trimmedUsername);
        console.log(`[CREATE] Updated username to: ${trimmedUsername} for socket: ${socket.id}`);
        
        // Generate a unique room code
        let code;
        let isUnique = false;
  
        while (!isUnique) {
          code = generateRoomCode();
          const Room = getModel('Room');
          const existingRoom = await Room.findOne({ code });
          isUnique = !existingRoom;
          console.log(`[CREATE] Generated code: ${code}, isUnique: ${isUnique}`);
        }
        
        // Ensure code is uppercase
        code = code.toUpperCase();
  
        // Create room with selected algorithms
        const Room = getModel('Room');
        console.log(`[CREATE] Creating room with code: ${code}`);
        const room = await Room.create({
          code,
          host: socket.id,
          hostUsername: trimmedUsername,
          players: [{
            socketId: socket.id,
            username: trimmedUsername,
            isHost: true
          }],
          algorithms: algorithms
        });
        
        console.log(`[CREATE] Room created successfully with ID: ${room._id}, code: ${code}, host: ${socket.id}`);
  
        // Join the socket to the room
        console.log(`[CREATE] Joining socket to room: ${code}`);
        await socket.join(code);
        
        // Wait a moment to ensure socket is fully joined to the room
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify socket was added to room
        const socketsInRoom = await io.in(code).fetchSockets();
        console.log(`[CREATE] Sockets in room ${code} after join: ${socketsInRoom.length}`);
        console.log(`[CREATE] Socket IDs in room: ${socketsInRoom.map(s => s.id).join(', ')}`);
        console.log(`[CREATE] Room host is: ${room.host}`);
        console.log(`[CREATE] Current socket is host: ${socket.id === room.host}`);
        
        // If socket didn't join the room, try again
        if (socketsInRoom.length === 0) {
          console.log(`[CREATE] Socket didn't join room, trying again...`);
          await socket.join(code);
          // Wait again
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`[CREATE] Emitting room_created event to client`);
        socket.emit('room_created', { 
          roomCode: code,
          isHost: true
        });
        
        // Add player to room
        const player = {
          socketId: socket.id,
          username: trimmedUsername,
          isHost: socket.id === room.host
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
        
        // Send initial settings to client
        socket.emit('settings_updated', {
          roomCode: code,
          settings: {
            datasetSize: room.datasetSize,
            allowDuplicates: room.allowDuplicates,
            valueRange: room.valueRange,
            stepSpeed: room.stepSpeed
          }
        });
        
        console.log(`User ${trimmedUsername} (${socket.id}) created room ${code}`);
        
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
        const validAlgorithms = ['bubble', 'quick', 'inplacestable', 'merge', 'insertion', 'selection', 'heap', 'bogo'];
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
        
        // Store the bet using the bets controller
        placeBet(socket.id, socket.username, roomCode, algorithm);
        
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
    
    // Handle step speed update during race
    socket.on('update_race_speed', ({ roomCode, stepSpeed }) => {
      try {
        const Room = getModel('Room');
        
        // Validate input
        if (!roomCode || !roomCode.trim()) {
          socket.emit('race_error', { message: 'Room code is required' });
          return;
        }
        
        if (typeof stepSpeed !== 'number' || stepSpeed < 0) {
          socket.emit('race_error', { message: 'Invalid step speed value' });
          return;
        }
        
        // Normalize room code
        const normalizedRoomCode = roomCode.trim().toUpperCase();
        
        // Check if user is the host (we'll do this async while getting the room)
        Room.findOne({ code: normalizedRoomCode }).then(room => {
          if (!room) {
            socket.emit('race_error', { message: 'Room not found' });
            return;
          }
          
          // Check if user is the host
          if (room.host !== socket.id) {
            socket.emit('race_error', { message: 'Only host can update race speed' });
            return;
          }
          
          // Check if room is racing
          if (room.status !== 'racing') {
            socket.emit('race_error', { message: 'Room is not currently racing' });
            return;
          }
          
          // Update step speed
          updateRaceStepSpeed(io, socket, normalizedRoomCode, stepSpeed);
        }).catch(error => {
          console.error('Error checking room for step speed update:', error);
          socket.emit('race_error', { message: 'Server error' });
        });
      } catch (error) {
        console.error('Error updating race step speed:', error);
        socket.emit('race_error', { message: 'Server error' });
      }
    });
    
    // Handle end race early
    socket.on('end_race_early', ({ roomCode }) => {
      try {
        const Room = getModel('Room');
        
        // Validate input
        if (!roomCode || !roomCode.trim()) {
          socket.emit('race_error', { message: 'Room code is required' });
          return;
        }
        
        // Normalize room code
        const normalizedRoomCode = roomCode.trim().toUpperCase();
        
        // Check if user is the host and room is racing
        Room.findOne({ code: normalizedRoomCode }).then(async (room) => {
          if (!room) {
            socket.emit('race_error', { message: 'Room not found' });
            return;
          }
          
          // Check if user is the host
          if (room.host !== socket.id) {
            socket.emit('race_error', { message: 'Only host can end race early' });
            return;
          }
          
          // Check if room is racing
          if (room.status !== 'racing') {
            socket.emit('race_error', { message: 'Room is not currently racing' });
            return;
          }
          
          // End the race early
          await endRaceEarly(io, socket, normalizedRoomCode);
        }).catch(error => {
          console.error('Error checking room for ending race early:', error);
          socket.emit('race_error', { message: 'Server error' });
        });
      } catch (error) {
        console.error('Error ending race early:', error);
        socket.emit('race_error', { message: 'Server error' });
      }
    });
    
    // Handle reset room state
    socket.on('reset_room_state', async ({ roomCode }) => {
      try {
        const Room = getModel('Room');
        const room = await Room.findOne({ code: roomCode });
        
        if (!room) {
          socket.emit('room_error', { message: 'Room not found' });
          return;
        }
        
        // Check if user is the host
        if (room.host !== socket.id) {
          socket.emit('room_error', { message: 'Only host can reset the room' });
          return;
        }
        
        // Only allow reset if room is in 'finished' state
        if (room.status !== 'finished') {
          socket.emit('room_error', { message: 'Can only reset finished races' });
          return;
        }
        
        // Update room status to waiting
        room.status = 'waiting';
        await room.save();
        
        // Clean up any race data
        stopRace(roomCode);
        
        // Clear all bets for this room
        clearRoomBets(roomCode);
        
        // Broadcast the room state update to all clients in the room
        io.to(roomCode).emit('race_status', {
          status: 'waiting',
          algorithms: room.algorithms
        });
        
        // Send a bet reset signal to all clients
        io.to(roomCode).emit('bets_reset');
        
        socket.emit('room_state_reset', { roomCode });
      } catch (error) {
        console.error('Error resetting room state:', error);
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
          const socketsInRoom = await io.in(room.code).fetchSockets();
          
          if (socketsInRoom.length > 0 || (room.players && room.players.length > 1)) {
            // If sockets are found in the room, assign one as the new host
            if (socketsInRoom.length > 0) {
              // Assign a new host
              const newHostSocket = socketsInRoom[0];
              const newHostUsername = socketUsernames.get(newHostSocket.id) || 'New Host';
              room.host = newHostSocket.id;
              room.hostUsername = newHostUsername;
              await room.save();
              
              // Notify the new host
              io.to(newHostSocket.id).emit('host_assigned', { roomCode: room.code });
              
              // Notify all users in the room about the new host
              io.to(room.code).emit('host_changed', {
                socketId: newHostSocket.id,
                username: newHostUsername
              });

              console.log(`[DISCONNECT] Reassigned host in room ${room.code} from ${socket.username} to ${newHostUsername}`);
            }
            // If no sockets found but there are still players in the room (other than the disconnecting one)
            else if (room.players.length > 1) {
              // Find a player who isn't the disconnecting socket
              const newHostPlayer = room.players.find(p => p.socketId !== socket.id);
              if (newHostPlayer) {
                room.host = newHostPlayer.socketId;
                room.hostUsername = newHostPlayer.username;
                await room.save();
                
                console.log(`[DISCONNECT] Assigned new host ${newHostPlayer.username} from players array in room ${room.code}`);
                
                // Try to notify the new host
                io.to(newHostPlayer.socketId).emit('host_assigned', { roomCode: room.code });
                
                // Notify all users in the room about the new host
                io.to(room.code).emit('host_changed', {
                  socketId: newHostPlayer.socketId,
                  username: newHostPlayer.username
                });
              }
            }
          } else {
            // No users left, but don't delete immediately - set a flag for pending deletion
            console.log(`[DISCONNECT] Room ${room.code} has no active users, marking for potential deletion`);
            
            // Set a deletion flag and timestamp
            room.pendingDeletion = true;
            room.deletionTimestamp = Date.now();
            await room.save();
            
            // Schedule a check after 10 seconds to see if anyone rejoined
            setTimeout(async () => {
              try {
                // Check if room still exists
                const checkRoom = await Room.findOne({ code: room.code });
                if (!checkRoom) return; // Room already deleted
                
                // Check if it still has the deletion flag
                if (!checkRoom.pendingDeletion) return; // Flag was removed
                
                // Check if anyone is in the room now
                const currentSockets = await io.in(room.code).fetchSockets();
                if (currentSockets.length > 0) {
                  // Someone joined, cancel deletion
                  console.log(`[DISCONNECT] Cancelling deletion of room ${room.code} - users are present`);
                  checkRoom.pendingDeletion = false;
                  await checkRoom.save();
                  return;
                }
                
                // If we reached here, the room is still empty after the delay
                console.log(`[DISCONNECT] Deleting empty room ${room.code} after waiting period`);
                await Room.findOneAndDelete({ _id: checkRoom._id });
                
                // Clean up any active races
                stopRace(room.code);
              } catch (err) {
                console.error(`[DISCONNECT] Error in delayed room deletion check: ${err.message}`);
              }
            }, 10000); // Wait 10 seconds
          }
        }
        
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      const disconnectedUsername = socketUsernames.get(socket.id) || 'Unknown User';
      console.log(`Client disconnected: ${socket.id} (${disconnectedUsername})`);
      
      // Remove from active connections
      activeConnections.delete(socket.id);
      
      try {
        // Find any rooms where this socket is the host
        const Room = getModel('Room');
        const hostedRooms = await Room.find({ host: socket.id });
        
        for (const room of hostedRooms) {
          // Get all sockets in the room
          const socketsInRoom = await io.in(room.code).fetchSockets();
          
          if (socketsInRoom.length > 0 || (room.players && room.players.length > 1)) {
            // If sockets are found in the room, assign one as the new host
            if (socketsInRoom.length > 0) {
              // Assign a new host
              const newHostSocket = socketsInRoom[0];
              const newHostUsername = socketUsernames.get(newHostSocket.id) || 'New Host';
              room.host = newHostSocket.id;
              room.hostUsername = newHostUsername;
              await room.save();
              
              // Notify the new host
              io.to(newHostSocket.id).emit('host_assigned', { roomCode: room.code });
              
              // Notify all users in the room about the new host
              io.to(room.code).emit('host_changed', {
                socketId: newHostSocket.id,
                username: newHostUsername
              });

              console.log(`[DISCONNECT] Reassigned host in room ${room.code} from ${disconnectedUsername} to ${newHostUsername}`);
            }
            // If no sockets found but there are still players in the room (other than the disconnecting one)
            else if (room.players.length > 1) {
              // Find a player who isn't the disconnecting socket
              const newHostPlayer = room.players.find(p => p.socketId !== socket.id);
              if (newHostPlayer) {
                room.host = newHostPlayer.socketId;
                room.hostUsername = newHostPlayer.username;
                await room.save();
                
                console.log(`[DISCONNECT] Assigned new host ${newHostPlayer.username} from players array in room ${room.code}`);
                
                // Try to notify the new host
                io.to(newHostPlayer.socketId).emit('host_assigned', { roomCode: room.code });
                
                // Notify all users in the room about the new host
                io.to(room.code).emit('host_changed', {
                  socketId: newHostPlayer.socketId,
                  username: newHostPlayer.username
                });
              }
            }
          } else {
            // No users left, but don't delete immediately - set a flag for pending deletion
            console.log(`[DISCONNECT] Room ${room.code} has no active users, marking for potential deletion`);
            
            // Set a deletion flag and timestamp
            room.pendingDeletion = true;
            room.deletionTimestamp = Date.now();
            await room.save();
            
            // Schedule a check after 10 seconds to see if anyone rejoined
            setTimeout(async () => {
              try {
                // Check if room still exists
                const checkRoom = await Room.findOne({ code: room.code });
                if (!checkRoom) return; // Room already deleted
                
                // Check if it still has the deletion flag
                if (!checkRoom.pendingDeletion) return; // Flag was removed
                
                // Check if anyone is in the room now
                const currentSockets = await io.in(room.code).fetchSockets();
                if (currentSockets.length > 0) {
                  // Someone joined, cancel deletion
                  console.log(`[DISCONNECT] Cancelling deletion of room ${room.code} - users are present`);
                  checkRoom.pendingDeletion = false;
                  await checkRoom.save();
                  return;
                }
                
                // If we reached here, the room is still empty after the delay
                console.log(`[DISCONNECT] Deleting empty room ${room.code} after waiting period`);
                await Room.findOneAndDelete({ _id: checkRoom._id });
                
                // Clean up any active races
                stopRace(room.code);
              } catch (err) {
                console.error(`[DISCONNECT] Error in delayed room deletion check: ${err.message}`);
              }
            }, 10000); // Wait 10 seconds
          }
        }
        
        // Find all rooms this socket was in (as a player, not just host)
        const allRooms = await Room.find();
        for (const room of allRooms) {
          const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
          
          if (playerIndex !== -1) {
            const playerUsername = room.players[playerIndex].username;
            console.log(`[DISCONNECT] Removing player ${playerUsername} from room ${room.code}`);
            
            // Remove player from room
            room.players.splice(playerIndex, 1);
            
            // Only save if the room still exists (double-check)
            try {
              await room.save();
              
              // Notify remaining players
              io.to(room.code).emit('user_left', {
                socketId: socket.id,
                username: playerUsername
              });
              
              // Notify about updated player list
              const updatedPlayers = room.players.map(p => ({
                ...p,
                isHost: p.socketId === room.host
              }));
              
              io.to(room.code).emit('room_players', { 
                players: updatedPlayers
              });
            } catch (saveError) {
              console.error(`[DISCONNECT] Error saving room ${room.code} after player removal: ${saveError.message}`);
            }
          }
        }
        
        // Remove from username map
        socketUsernames.delete(socket.id);
      } catch (error) {
        console.error('Error handling disconnection:', error);
      }
      
      // Clean up heartbeat tracking
      lastHeartbeats.delete(socket.id);
      console.log(`[HEARTBEAT] Removed tracking for ${socket.id} (${disconnectedUsername})`);
    });
  });
};

module.exports = {
  registerSocketHandlers
}; 