const socket = require('socket.io-client')('http://localhost:5000');

// Connection event
socket.on('connect', () => {
  console.log('Connected to server');
  
  // Test room creation
  console.log('Testing room creation...');
  socket.emit('create_room', { 
    algorithms: ['bubble', 'quick', 'merge'],
    username: 'TestUser'
  });
});

// Disconnect event
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Connection error
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

// Room created event
socket.on('room_created', ({ roomCode, isHost }) => {
  console.log(`Room created successfully: ${roomCode}`);
  console.log(`Is host: ${isHost}`);
  
  // Test room joining with the created room code
  setTimeout(() => {
    console.log('Testing room joining...');
    socket.emit('join_room', { 
      roomCode, 
      username: 'TestUser2'
    });
  }, 1000);
});

// Room joined event
socket.on('room_joined', ({ roomCode }) => {
  console.log(`Room joined successfully: ${roomCode}`);
  
  // Disconnect after testing is complete
  setTimeout(() => {
    console.log('Tests completed, disconnecting...');
    socket.disconnect();
  }, 1000);
});

// Room error event
socket.on('room_error', ({ message }) => {
  console.error('Room error:', message);
});

// Room players event
socket.on('room_players', ({ players }) => {
  console.log('Players in room:', players);
});

// Algorithms updated event
socket.on('algorithms_updated', ({ roomCode, algorithms }) => {
  console.log(`Algorithms for room ${roomCode}:`, algorithms);
});

console.log('Starting socket.io client test...'); 