const { getModel } = require('../config/db');

// Helper function to place a bet
exports.placeBet = async (socketId, username, roomCode, algorithm) => {
  // Normalize room code to uppercase
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  try {
    // Get the room
    const Room = getModel('Room');
    const room = await Room.findOne({ code: normalizedRoomCode });
    
    if (!room) {
      console.error(`Room ${normalizedRoomCode} not found when placing bet`);
      return null;
    }
    
    // Place bet in the room
    const bet = room.placeBet(socketId, username, algorithm);
    
    // Save the room to persist the bet
    await room.save();
    
    return bet;
  } catch (error) {
    console.error(`Error placing bet: ${error.message}`);
    return null;
  }
};

/**
 * Get all bets for a room
 * @param {string} roomCode - The room code
 * @returns {Array} - Array of bets for the room
 */
const getAllBetsForRoom = async (roomCode) => {
  // Normalize room code
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  try {
    // Get the room
    const Room = getModel('Room');
    const room = await Room.findOne({ code: normalizedRoomCode });
    
    if (!room) {
      console.error(`Room ${normalizedRoomCode} not found when getting bets`);
      return [];
    }
    
    // Get all bets from the room
    return room.getAllBets();
  } catch (error) {
    console.error(`Error getting bets: ${error.message}`);
    return [];
  }
};

/**
 * Clear all bets for a room
 * @param {string} roomCode - The room code
 */
const clearRoomBets = async (roomCode) => {
  // Normalize room code
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  try {
    // Get the room
    const Room = getModel('Room');
    const room = await Room.findOne({ code: normalizedRoomCode });
    
    if (!room) {
      console.error(`Room ${normalizedRoomCode} not found when clearing bets`);
      return false;
    }
    
    // Clear bets in the room
    room.clearBets();
    
    // Save the room to persist changes
    await room.save();
    
    return true;
  } catch (error) {
    console.error(`Error clearing bets: ${error.message}`);
    return false;
  }
};

/**
 * Award points to players after a race
 * @param {string} roomCode - The room code
 * @param {string} winnerAlgorithm - The winning algorithm
 * @param {Array} playerBets - Array of player bets
 */
const awardPoints = async (roomCode, winnerAlgorithm, playerBets) => {
  // Normalize room code
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  console.log(`🎖️ Awarding points in room ${normalizedRoomCode} for algorithm ${winnerAlgorithm}`, 
    { betsCount: playerBets.length });
  
  try {
    // Get the room
    const Room = getModel('Room');
    const room = await Room.findOne({ code: normalizedRoomCode });
    
    if (!room) {
      console.error(`Room ${normalizedRoomCode} not found when awarding points`);
      return false;
    }
    
    let updatedCount = 0;
    
    // Award points to winners
    for (const bet of playerBets) {
      console.log(`Checking bet for ${bet.username}: bet=${bet.algorithm}, winner=${winnerAlgorithm}, match=${bet.algorithm === winnerAlgorithm}`);
      
      if (bet.algorithm === winnerAlgorithm) {
        // Add point directly to the room
        room.addPoint(bet.socketId, bet.username);
        updatedCount++;
      }
    }
    
    // Save the room to persist the points
    await room.save();
    
    console.log(`Updated ${updatedCount} player points for room ${normalizedRoomCode}`);
    
    return updatedCount > 0;
  } catch (error) {
    console.error(`Error awarding points: ${error.message}`);
    return false;
  }
};

/**
 * Get the leaderboard for a room with usernames included
 * @param {string} roomCode - The room code
 * @returns {Array} - Array of players with points, sorted by points
 */
const getLeaderboardWithUsernames = async (roomCode) => {
  // Normalize room code
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  console.log(`📊 Getting leaderboard for room ${normalizedRoomCode}`);
  
  try {
    // Get the room
    const Room = getModel('Room');
    const room = await Room.findOne({ code: normalizedRoomCode });
    
    if (!room) {
      console.error(`Room ${normalizedRoomCode} not found when getting leaderboard`);
      return [];
    }
    
    // Get leaderboard directly from the room
    const leaderboard = room.getLeaderboard();
    
    console.log(`📊 Leaderboard for ${normalizedRoomCode}:`, leaderboard);
    return leaderboard;
  } catch (error) {
    console.error(`Error getting leaderboard: ${error.message}`);
    return [];
  }
};

/**
 * Reset points for a room
 * @param {string} roomCode - The room code
 */
const resetRoomPoints = async (roomCode) => {
  // Normalize room code
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  console.log(`⚠️ Resetting points for room ${normalizedRoomCode}`);
  
  try {
    // Get the room
    const Room = getModel('Room');
    const room = await Room.findOne({ code: normalizedRoomCode });
    
    if (!room) {
      console.error(`Room ${normalizedRoomCode} not found when resetting points`);
      return false;
    }
    
    // Reset points in the room
    room.resetPoints();
    
    // Save the room to persist changes
    await room.save();
    
    console.log(`✅ Points reset for room ${normalizedRoomCode}`);
    return true;
  } catch (error) {
    console.error(`Error resetting points: ${error.message}`);
    return false;
  }
};

module.exports = {
  getAllBetsForRoom,
  clearRoomBets,
  awardPoints,
  getLeaderboardWithUsernames,
  resetRoomPoints,
  placeBet: exports.placeBet
}; 