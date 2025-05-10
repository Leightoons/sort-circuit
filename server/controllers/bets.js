const { getModel } = require('../config/db');

// In-memory store for bets
const bets = new Map();

// In-memory store for player points within rooms
const roomPlayerPoints = new Map();

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

/**
 * Get all bets for a room
 * @param {string} roomCode - The room code
 * @returns {Array} - Array of bets for the room
 */
const getAllBetsForRoom = (roomCode) => {
  // Normalize room code
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  const roomBets = [];
  
  for (const [key, bet] of bets.entries()) {
    if (bet.roomCode === normalizedRoomCode) {
      roomBets.push(bet);
    }
  }
  
  return roomBets;
};

/**
 * Clear all bets for a room
 * @param {string} roomCode - The room code
 */
const clearRoomBets = (roomCode) => {
  // Normalize room code
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  for (const [key, bet] of bets.entries()) {
    if (bet.roomCode === normalizedRoomCode) {
      bets.delete(key);
    }
  }
};

/**
 * Award points to players after a race
 * @param {string} roomCode - The room code
 * @param {string} winnerAlgorithm - The winning algorithm
 * @param {Array} playerBets - Array of player bets
 */
const awardPoints = (roomCode, winnerAlgorithm, playerBets) => {
  // Normalize room code
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  console.log(`🎖️ Awarding points in room ${normalizedRoomCode} for algorithm ${winnerAlgorithm}`, 
    { betsCount: playerBets.length, bets: playerBets });
  
  // Initialize room points if needed
  if (!roomPlayerPoints.has(normalizedRoomCode)) {
    console.log(`Creating new points map for room ${normalizedRoomCode}`);
    roomPlayerPoints.set(normalizedRoomCode, new Map());
  }
  
  const roomPoints = roomPlayerPoints.get(normalizedRoomCode);
  let updatedCount = 0;
  
  // Award points to winners
  for (const bet of playerBets) {
    if (bet.algorithm === winnerAlgorithm) {
      // Award points for correct bet
      const currentPoints = roomPoints.get(bet.socketId) || 0;
      const newPoints = currentPoints + 1;
      roomPoints.set(bet.socketId, newPoints);
      updatedCount++;
      
      console.log(`🎯 Player ${bet.username} (${bet.socketId}) earned a point! New total: ${newPoints}`);
    }
  }
  
  console.log(`Updated ${updatedCount} player points for room ${normalizedRoomCode}`);
  
  // Debug output the entire points map
  console.log(`🗺️ Current points map for room ${normalizedRoomCode}:`);
  for (const [socketId, points] of roomPoints.entries()) {
    console.log(`  - ${socketId}: ${points} points`);
  }
  
  return updatedCount > 0;
};

/**
 * Get the leaderboard for a room with usernames included
 * @param {string} roomCode - The room code
 * @param {Array} [playerBets] - Optional array of player bets to get usernames
 * @returns {Array} - Array of players with points, sorted by points
 */
const getLeaderboardWithUsernames = async (roomCode, playerBets = []) => {
  // Normalize room code
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  // Initialize points map if it doesn't exist yet
  if (!roomPlayerPoints.has(normalizedRoomCode)) {
    console.log(`No points map for room ${normalizedRoomCode}, creating a new one`);
    roomPlayerPoints.set(normalizedRoomCode, new Map());
  }
  
  const roomPoints = roomPlayerPoints.get(normalizedRoomCode);
  const leaderboard = [];
  
  try {
    // Get room players from database
    const Room = getModel('Room');
    const room = await Room.findOne({ code: normalizedRoomCode });
    
    if (!room || !room.players || room.players.length === 0) {
      console.log(`No players found in room ${normalizedRoomCode}`);
      return [];
    }
    
    console.log(`Found ${room.players.length} players in room ${normalizedRoomCode}`);
    
    // Include ALL players from the room in the leaderboard, with 0 points by default
    for (const player of room.players) {
      const points = roomPoints.get(player.socketId) || 0;
      
      leaderboard.push({ 
        socketId: player.socketId, 
        points,
        username: player.username || 'Unknown Player'
      });
      
      console.log(`Added player ${player.username} to leaderboard with ${points} points`);
    }
  } catch (error) {
    console.error(`Error getting room players for leaderboard: ${error.message}`);
  }
  
  // Sort by points (descending)
  const sortedLeaderboard = leaderboard.sort((a, b) => b.points - a.points);
  console.log(`Built leaderboard for ${normalizedRoomCode} with ${sortedLeaderboard.length} entries:`, sortedLeaderboard);
  return sortedLeaderboard;
};

/**
 * Get the leaderboard for a room
 * @param {string} roomCode - The room code
 * @returns {Array} - Array of players with points, sorted by points
 */
const getLeaderboard = (roomCode) => {
  // Normalize room code
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  if (!roomPlayerPoints.has(normalizedRoomCode)) {
    console.log(`No points data for room ${normalizedRoomCode}`);
    return [];
  }
  
  const roomPoints = roomPlayerPoints.get(normalizedRoomCode);
  const leaderboard = [];
  
  for (const [socketId, points] of roomPoints.entries()) {
    leaderboard.push({ socketId, points });
  }
  
  // Sort by points (descending)
  return leaderboard.sort((a, b) => b.points - a.points);
};

/**
 * Reset points for a room
 * @param {string} roomCode - The room code
 */
const resetRoomPoints = (roomCode) => {
  // Normalize room code
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  console.log(`Resetting points for room ${normalizedRoomCode}`);
  roomPlayerPoints.delete(normalizedRoomCode);
};

module.exports = {
  getAllBetsForRoom,
  clearRoomBets,
  awardPoints,
  getLeaderboard,
  getLeaderboardWithUsernames,
  resetRoomPoints
}; 