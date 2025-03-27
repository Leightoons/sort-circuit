const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./config/db');
const { registerSocketHandlers } = require('./socketHandlers');
require('dotenv').config();

// Set development mode if not specified
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
  console.log('Environment not specified, defaulting to development mode');
}

console.log(`Running in ${process.env.NODE_ENV} mode`);

// Initialize in-memory database
initializeDatabase();

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

// Register socket.io handlers
registerSocketHandlers(io);

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