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
  
  console.log(`🎖️ POINTS: Awarding points in room ${normalizedRoomCode} for algorithm ${winnerAlgorithm}`, 
    { betsCount: playerBets.length });
  
  try {
    // Get the room
    const Room = getModel('Room');
    const room = await Room.findOne({ code: normalizedRoomCode });
    
    if (!room) {
      console.error(`Room ${normalizedRoomCode} not found when awarding points`);
      return false;
    }
    
    console.log(`🔍 POINTS: ROOM ID ${room._id} | Room points before award:`, JSON.stringify(room.playerPoints, null, 2));
    
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
    
    // Extra debugging - check the points BEFORE SAVE
    console.log(`🔍 POINTS: ROOM ID ${room._id} | Room points after award (before save):`, JSON.stringify(room.playerPoints, null, 2));
    
    // Save the room to persist the points
    await room.save();
    
    // Verify the points were saved correctly by fetching the room again
    const verifyRoom = await Room.findOne({ code: normalizedRoomCode });
    console.log(`🔍 POINTS: VERIFY ROOM ID ${verifyRoom._id} | Room points after save:`, JSON.stringify(verifyRoom.playerPoints, null, 2));
    
    console.log(`Updated ${updatedCount} player points for room ${normalizedRoomCode}`);
    
    return updatedCount > 0;
  } catch (error) {
    console.error(`Error awarding points: ${error.message}`);
    return false;
  }
};

/**
 * Get the leaderboard for a room with usernames included
 * This function always returns a usable leaderboard, even between races
 * @param {string} roomCode - The room code
 * @returns {Array} - Array of players with points, sorted by points
 */
const getLeaderboardWithUsernames = async (roomCode) => {
  // Normalize room code
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  console.log(`📊 POINTS: Getting leaderboard for room ${normalizedRoomCode}`);
  
  try {
    // Get the room
    const Room = getModel('Room');
    const room = await Room.findOne({ code: normalizedRoomCode });
    
    if (!room) {
      console.error(`Room ${normalizedRoomCode} not found when getting leaderboard`);
      return [];
    }
    
    console.log(`🔍 POINTS: ROOM ID ${room._id} | Room players: ${room.players.length}, Points data: ${Object.keys(room.playerPoints || {}).length} entries`);
    
    // Always build a fresh leaderboard when this function is called
    // This ensures it's always up to date when displayed
    console.log(`Building fresh leaderboard for room ${normalizedRoomCode}`);
    
    // Get leaderboard directly from the room's method
    // The room's getLeaderboard() will handle combining points data with current players
    let leaderboard = room.getLeaderboard();
    
    // If the leaderboard is empty but we have players, build it from scratch
    if (leaderboard.length === 0 && room.players && room.players.length > 0) {
      console.log(`Leaderboard was empty but room has ${room.players.length} players - creating entries for all players`);
      
      // Create a fresh leaderboard with all players
      leaderboard = room.players.map(player => ({
        socketId: player.socketId,
        username: player.username || 'Unknown Player',
        points: 0 // Start with 0 points
      }));
    }
    
    // Always ensure all current room players are included (even with 0 points)
    // This makes sure players who haven't earned points yet still appear on the leaderboard
    if (room.players && room.players.length > 0) {
      // Create a map of existing player entries for quick lookup
      const existingPlayers = new Map(leaderboard.map(entry => [entry.socketId, entry]));
      
      // Add any players missing from the leaderboard
      for (const player of room.players) {
        if (!existingPlayers.has(player.socketId)) {
          leaderboard.push({
            socketId: player.socketId,
            username: player.username || 'Unknown Player',
            points: 0
          });
        }
      }
      
      // Re-sort after adding any missing players
      leaderboard.sort((a, b) => b.points - a.points);
    }
    
    console.log(`📊 POINTS: Leaderboard for ${normalizedRoomCode} (${leaderboard.length} entries)`);
    return leaderboard;
  } catch (error) {
    console.error(`Error getting leaderboard: ${error.message}`);
    return [];
  }
};

/**
 * Reset points for a room - CAUTION: This will erase all player points!
 * This function should only be used when explicitly needed (e.g., ending a tournament)
 * and NOT for normal race resets.
 * @param {string} roomCode - The room code
 */
const resetRoomPoints = async (roomCode) => {
  // Normalize room code
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  console.log(`⚠️ WARNING: RESETTING ALL POINTS for room ${normalizedRoomCode}`);
  console.log(`🛑 THIS SHOULD NOT BE CALLED DURING NORMAL OPERATION - Points should persist between races`);
  
  try {
    // Get the room
    const Room = getModel('Room');
    const room = await Room.findOne({ code: normalizedRoomCode });
    
    if (!room) {
      console.error(`Room ${normalizedRoomCode} not found when resetting points`);
      return false;
    }
    
    // Log current points before reset
    console.log(`Current points that will be ERASED: ${JSON.stringify(room.playerPoints, null, 2)}`);
    
    // Reset points in the room
    room.resetPoints();
    
    // Save the room to persist changes
    await room.save();
    
    console.log(`✅ Points have been reset for room ${normalizedRoomCode}`);
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