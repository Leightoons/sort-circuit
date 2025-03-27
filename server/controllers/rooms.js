const { getModel } = require('../config/db');
const User = require('../models/User');
const { generateDataset } = require('../utils/algorithmEngine');

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Public
exports.createRoom = async (req, res) => {
  try {
    const { code, host, algorithms } = req.body;
    
    // Validate input
    if (!code || !host) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if room with code already exists
    const Room = getModel('Room');
    const existingRoom = await Room.findOne({ code });
    
    if (existingRoom) {
      return res.status(400).json({ message: 'Room with this code already exists' });
    }
    
    // Create room with default settings
    const room = await Room.create({
      code,
      host,
      algorithms: algorithms || ['bubble', 'quick', 'merge']
    });
    
    // Return room details
    const populatedRoom = await Room.findById(room._id)
    
    res.status(201).json({
      success: true,
      data: populatedRoom
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get room by code
// @route   GET /api/rooms/:code
// @access  Public
exports.getRoomByCode = async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code })
      .populate('host', 'username')
      .populate('players', 'username');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Join a room
// @route   POST /api/rooms/:code/join
// @access  Private
exports.joinRoom = async (req, res) => {
  try {
    let room = await Room.findOne({ code: req.params.code });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Check if user is already in the room
    if (room.players.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Already in room' });
    }

    // Add user to players
    room.players.push(req.user.id);
    await room.save();

    room = await Room.findById(room._id)
      .populate('host', 'username')
      .populate('players', 'username');

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Leave a room
// @route   POST /api/rooms/:code/leave
// @access  Private
exports.leaveRoom = async (req, res) => {
  try {
    let room = await Room.findOne({ code: req.params.code });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Remove user from players
    room.players = room.players.filter(
      player => player.toString() !== req.user.id
    );

    // If host leaves, assign a new host or delete the room
    if (room.host.toString() === req.user.id) {
      if (room.players.length > 0) {
        room.host = room.players[0];
      } else {
        await Room.findByIdAndDelete(room._id);
        return res.status(200).json({
          success: true,
          data: {}
        });
      }
    }

    await room.save();

    room = await Room.findById(room._id)
      .populate('host', 'username')
      .populate('players', 'username');

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update room settings
// @route   PUT /api/rooms/:code
// @access  Private
exports.updateRoom = async (req, res) => {
  try {
    let room = await Room.findOne({ code: req.params.code });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Ensure only host can update settings
    if (room.host.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this room' });
    }

    // Update allowed fields
    const allowedUpdates = ['algorithms', 'datasetSize', 'allowDuplicates', 'valueRange', 'stepSpeed'];
    
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        room[field] = req.body[field];
      }
    }

    await room.save();

    room = await Room.findById(room._id)
      .populate('host', 'username')
      .populate('players', 'username');

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Generate dataset for a room
// @route   GET /api/rooms/:code/dataset
// @access  Private
exports.generateRoomDataset = async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code });

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Generate dataset based on room settings
    const dataset = generateDataset(
      room.datasetSize,
      room.valueRange.min,
      room.valueRange.max,
      room.allowDuplicates
    );

    res.status(200).json({
      success: true,
      data: dataset
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}; 