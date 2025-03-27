const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Default route
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Sort Circuit API' });
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Handle room creation
  socket.on('create_room', (data) => {
    // Room creation logic will be implemented here
    console.log('Room creation requested:', data);
  });
  
  // Handle room joining
  socket.on('join_room', (data) => {
    // Room joining logic will be implemented here
    console.log('Room join requested:', data);
  });
  
  // Handle algorithm selection
  socket.on('select_algorithm', (data) => {
    // Algorithm selection logic will be implemented here
    console.log('Algorithm selection:', data);
  });
  
  // Handle user betting
  socket.on('place_bet', (data) => {
    // Betting logic will be implemented here
    console.log('Bet placed:', data);
  });
  
  // Handle race start
  socket.on('start_race', (data) => {
    // Race start logic will be implemented here
    console.log('Race start requested:', data);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Set port and start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 