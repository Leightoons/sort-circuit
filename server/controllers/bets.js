const { getModel } = require('../config/db');

// Simple in-memory store for bets
const bets = new Map();

// Helper function to place a bet
exports.placeBet = (socketId, username, roomCode, algorithm) => {
  // Normalize room code to uppercase
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  const betKey = `${normalizedRoomCode}:${socketId}`;
  
  bets.set(betKey, {
    socketId,
    username,
    roomCode: normalizedRoomCode,
    algorithm,
    timestamp: Date.now()
  });
  
  return {
    socketId,
    username,
    algorithm
  };
};

// Helper function to get all bets for a specific room
exports.getAllBetsForRoom = (roomCode) => {
  // Normalize room code to uppercase
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  const roomBets = [];
  
  for (const [key, bet] of bets.entries()) {
    if (bet.roomCode === normalizedRoomCode) {
      roomBets.push(bet);
    }
  }
  
  return roomBets;
};

// Helper function to clear bets for a room after race completion
exports.clearRoomBets = (roomCode) => {
  // Normalize room code to uppercase
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  for (const [key, bet] of bets.entries()) {
    if (bet.roomCode === normalizedRoomCode) {
      bets.delete(key);
    }
  }
}; 