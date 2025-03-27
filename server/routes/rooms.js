const express = require('express');
const { 
  createRoom, 
  getRoomByCode, 
  joinRoom, 
  leaveRoom, 
  updateRoom,
  generateRoomDataset 
} = require('../controllers/rooms');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/:code', getRoomByCode);

// Protected routes
router.post('/', protect, createRoom);
router.post('/:code/join', protect, joinRoom);
router.post('/:code/leave', protect, leaveRoom);
router.put('/:code', protect, updateRoom);
router.get('/:code/dataset', protect, generateRoomDataset);

module.exports = router; 