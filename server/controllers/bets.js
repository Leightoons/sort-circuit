const { getModel } = require('../config/db');

// Simple in-memory store for bets
const bets = new Map();

// Helper function to place a bet
exports.placeBet = (socketId, username, roomCode, algorithm) => {
  const betKey = `${roomCode}:${socketId}`;
  
  bets.set(betKey, {
    socketId,
    username,
    roomCode,
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