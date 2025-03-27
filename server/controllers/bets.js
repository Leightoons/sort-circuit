const { getModel } = require('../config/db');
const User = require('../models/User');

// We'll create a simple in-memory store for bets since they're temporary
const bets = new Map();

// @desc    Place a bet on an algorithm
// @route   POST /api/rooms/:code/bet
// @access  Private
exports.placeBet = async (req, res) => {
  try {
    const { algorithm } = req.body;
    const roomCode = req.params.code;
    
    // Validate input
    if (!algorithm) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an algorithm to bet on'
      });
    }

    // Check if room exists
    const Room = getModel('Room');
    const room = await Room.findOne({ code: roomCode });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if algorithm is valid for this room
    if (!room.algorithms.includes(algorithm)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid algorithm selection'
      });
    }

    // Check if room is in waiting state
    if (room.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: 'Cannot place bets after race has started'
      });
    }

    // Store the bet
    const betKey = `${roomCode}:${req.user.id}`;
    bets.set(betKey, {
      userId: req.user.id,
      roomCode,
      algorithm,
      timestamp: Date.now()
    });

    res.status(200).json({
      success: true,
      data: {
        roomCode,
        algorithm
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all bets for a room
// @route   GET /api/rooms/:code/bets
// @access  Private
exports.getRoomBets = async (req, res) => {
  try {
    const roomCode = req.params.code;
    
    // Check if room exists
    const Room = getModel('Room');
    const room = await Room.findOne({ code: roomCode });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is in the room
    const isUserInRoom = room.players.some(player => player.toString() === req.user.id);
    if (!isUserInRoom) {
      return res.status(403).json({
        success: false,
        message: 'You must be in the room to view bets'
      });
    }

    // Get all bets for this room
    const roomBets = [];
    for (const [key, bet] of bets.entries()) {
      if (bet.roomCode === roomCode) {
        roomBets.push(bet);
      }
    }

    // Populate user information
    const userIds = roomBets.map(bet => bet.userId);
    const users = await User.find({ _id: { $in: userIds } }, 'username');
    const userMap = new Map(users.map(user => [user._id.toString(), user]));

    const populatedBets = roomBets.map(bet => ({
      ...bet,
      username: userMap.get(bet.userId.toString()).username
    }));

    res.status(200).json({
      success: true,
      data: populatedBets
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get bet for a specific user in a room
// @route   GET /api/rooms/:code/bets/me
// @access  Private
exports.getMyBet = async (req, res) => {
  try {
    const roomCode = req.params.code;
    const betKey = `${roomCode}:${req.user.id}`;
    
    const bet = bets.get(betKey);
    
    if (!bet) {
      return res.status(404).json({
        success: false,
        message: 'No bet found'
      });
    }

    res.status(200).json({
      success: true,
      data: bet
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper function to get all bets for a specific room (for internal use)
exports.getAllBetsForRoom = (roomCode) => {
  const roomBets = [];
  for (const [key, bet] of bets.entries()) {
    if (bet.roomCode === roomCode) {
      roomBets.push(bet);
    }
  }
  return roomBets;
};

// Helper function to clear bets for a room after race completion
exports.clearRoomBets = (roomCode) => {
  for (const [key, bet] of bets.entries()) {
    if (bet.roomCode === roomCode) {
      bets.delete(key);
    }
  }
}; 