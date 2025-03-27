const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { registerSocketHandlers } = require('./socketHandlers');
require('dotenv').config();

// Import route files
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const betRoutes = require('./routes/bets');

// Connect to database
connectDB();

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

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/rooms/:code/bets', betRoutes);

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