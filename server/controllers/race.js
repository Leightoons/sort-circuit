const { getModel } = require('../config/db');
const { createAlgorithm, generateDataset } = require('../utils/algorithmEngine');
const { getAllBetsForRoom, clearRoomBets, awardPoints, getLeaderboardWithUsernames } = require('./bets');

// In-memory store for active races
const activeRaces = new Map();

// @desc    Start a race
// @access  Server-only
exports.startRace = async (io, socket, roomCode, room) => {
  try {
    // Normalize room code for consistency
    const normalizedRoomCode = roomCode.trim().toUpperCase();
    
    if (!room) {
      // Find room if not provided
      const Room = getModel('Room');
      room = await Room.findOne({ code: normalizedRoomCode });
      
      if (!room) {
        socket.emit('race_error', { message: 'Room not found' });
        return;
      }
    }
    
    // Check if race is already running
    if (activeRaces.has(normalizedRoomCode)) {
      socket.emit('race_error', { message: 'Race is already in progress' });
      return;
    }
    
    // Ensure we have at least 2 algorithms selected
    if (!room.algorithms || room.algorithms.length < 2) {
      socket.emit('race_error', { message: 'Must have at least 2 algorithms selected for a race' });
      return;
    }
    
    console.log(`Starting race in room ${normalizedRoomCode} with algorithms:`, room.algorithms);
    
    // Generate dataset
    const dataset = generateDataset(
      room.datasetSize,
      room.valueRange.min,
      room.valueRange.max,
      room.allowDuplicates
    );
    
    // Create algorithm instances
    const algorithms = {};
    for (const algorithmType of room.algorithms) {
      algorithms[algorithmType] = createAlgorithm(algorithmType, dataset, room.stepSpeed);
    }
    
    // Store race data with normalized room code
    activeRaces.set(normalizedRoomCode, {
      roomCode: normalizedRoomCode,
      algorithms,
      dataset,
      startTime: Date.now(),
      stepSpeed: room.stepSpeed,
      finishedAlgorithms: [],
      bets: await getAllBetsForRoom(normalizedRoomCode)
    });
    
    // Broadcast race start to room
    io.to(normalizedRoomCode).emit('race_started', {
      roomCode: normalizedRoomCode,
      algorithms: room.algorithms,
      dataset
    });
    
    // Start all the sorting algorithms asynchronously
    const race = activeRaces.get(normalizedRoomCode);
    
    // Start the algorithms and set up regular update broadcasts
    await runRaceAlgorithms(io, normalizedRoomCode, race);
    
  } catch (error) {
    console.error('Error starting race:', error);
    socket.emit('race_error', { message: 'Server error' });
  }
};

// Run all the algorithms and broadcast updates
const runRaceAlgorithms = async (io, roomCode, race) => {
  try {
    // Normalize room code for consistency (if not already done)
    const normalizedRoomCode = roomCode.trim().toUpperCase();
    
    // Set up a regular interval to broadcast the current state
    const updateInterval = setInterval(() => {
      broadcastRaceUpdate(io, normalizedRoomCode, race);
    }, Math.min(100, race.stepSpeed)); // Update regularly, but not more than 10 times per second
    
    // Store the interval reference in the race object so it can be cleared when ending early
    race.updateInterval = updateInterval;
    
    // Start each algorithm and handle completion
    const algorithmPromises = Object.entries(race.algorithms).map(async ([type, algorithm]) => {
      try {
        // Start the algorithm
        await algorithm.run();
        
        // When algorithm finishes, record it
        const position = race.finishedAlgorithms.push(type);
        
        // Notify clients about algorithm completion
        io.to(normalizedRoomCode).emit('algorithm_finished', {
          type,
          position,
          steps: algorithm.currentStep,
          comparisons: algorithm.comparisons,
          swaps: algorithm.swaps,
          arrayAccesses: algorithm.arrayAccesses,
          arrayWrites: algorithm.arrayWrites
        });
        
        // Check if all algorithms are done
        if (race.finishedAlgorithms.length === Object.keys(race.algorithms).length) {
          if (race.updateInterval) {
            clearInterval(race.updateInterval);
          }
          await finalizeRace(io, normalizedRoomCode);
        }
      } catch (error) {
        console.error(`Error running algorithm ${type}:`, error);
      }
    });
    
    // No need to await all promises, let them run independently
  } catch (error) {
    console.error('Error running race algorithms:', error);
  }
};

// Broadcast the current state of all algorithms
const broadcastRaceUpdate = (io, roomCode, race) => {
  // Normalize room code for consistency
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  
  const updates = {};
  
  // Get current state of each algorithm
  for (const [type, algorithm] of Object.entries(race.algorithms)) {
    updates[type] = algorithm.getState();
  }
  
  // Broadcast updates to all clients in the room
  io.to(normalizedRoomCode).emit('race_update', {
    roomCode: normalizedRoomCode,
    updates
  });
};

/**
 * Calculates results for a single algorithm
 * @param {object} algorithm - The algorithm instance
 * @param {string} type - The algorithm type
 * @param {object} race - The race data
 * @param {Array} stoppedAlgorithms - List of algorithms that were stopped early
 * @param {string} winnerAlgorithm - The winning algorithm type
 * @returns {object} - The algorithm results
 */
const calculateAlgorithmResult = (algorithm, type, race, stoppedAlgorithms, winnerAlgorithm) => {
  // Find the position in finished algorithms
  const position = race.finishedAlgorithms.indexOf(type) + 1;
  
  // Only mark as stopped early if this algorithm was explicitly stopped
  // Not just because it wasn't the winner in an early ended race
  const wasStoppedEarly = stoppedAlgorithms.includes(type);
  
  return {
    position,
    steps: algorithm.currentStep,
    comparisons: algorithm.comparisons,
    swaps: algorithm.swaps,
    arrayAccesses: algorithm.arrayAccesses,
    arrayWrites: algorithm.arrayWrites,
    isWinner: type === winnerAlgorithm,
    stoppedEarly: wasStoppedEarly
  };
};

// Finalize the race and update scores
const finalizeRace = async (io, roomCode) => {
  try {
    // Normalize room code for consistency
    const normalizedRoomCode = roomCode.trim().toUpperCase();
    
    const race = activeRaces.get(normalizedRoomCode);
    
    if (!race) {
      console.log(`No active race found for room ${normalizedRoomCode}`);
      return;
    }
    
    // Get room
    const Room = getModel('Room');
    const room = await Room.findOne({ code: normalizedRoomCode });
    if (!room) {
      console.log(`Room ${normalizedRoomCode} not found in database`);
      return;
    }
    
    // Update room status
    room.status = 'finished';
    await room.save();
    
    // Determine winner algorithm
    const winnerAlgorithm = race.finishedAlgorithms[0];
    
    // Find all winning bets (bets on the winning algorithm)
    const winningBets = [];
    const winningUsers = [];
    
    // Get all bets for this room to award points
    const allBets = await getAllBetsForRoom(normalizedRoomCode);
    console.log(`📊 Retrieved ${allBets.length} bets for room ${normalizedRoomCode}`);
    
    // Find winning bets
    for (const bet of allBets) {
      console.log(`  - Room bet: player=${bet.username}, algorithm=${bet.algorithm}`);
      if (bet.algorithm === winnerAlgorithm) {
        winningBets.push(bet);
        winningUsers.push(bet.socketId);
      }
    }
    
    // Award points to players who bet correctly - returns true if points were awarded
    const pointsAwarded = await awardPoints(normalizedRoomCode, winnerAlgorithm, allBets);
    console.log(`Points awarded in race: ${pointsAwarded}`);
    
    // Get the leaderboard with usernames - this will include all players even if they have 0 points
    const leaderboard = await getLeaderboardWithUsernames(normalizedRoomCode);
    
    console.log(`🏁 Room ${normalizedRoomCode} race finished. Leaderboard (${leaderboard.length} entries):`, leaderboard);
    
    // Keep track of the algorithms that were forcibly stopped
    const stoppedAlgorithms = race.stoppedAlgorithms || [];
    
    // Get final results with performance metrics
    const results = {};
    for (const [type, algorithm] of Object.entries(race.algorithms)) {
      // Only mark as stopped early if this algorithm was explicitly stopped
      // Not just because it wasn't the winner in an early ended race
      results[type] = calculateAlgorithmResult(algorithm, type, race, stoppedAlgorithms, winnerAlgorithm);
    }
    
    // Broadcast race results
    io.to(normalizedRoomCode).emit('race_results', {
      roomCode: normalizedRoomCode,
      results,
      winnerAlgorithm,
      winningUsers,
      endedEarly: race.endedEarly || false,
      leaderboard: leaderboard
    });
    
    // Also broadcast the updated leaderboard directly to ensure it's received
    io.to(normalizedRoomCode).emit('leaderboard_update', {
      roomCode: normalizedRoomCode,
      leaderboard: leaderboard
    });
    
    // Clean up
    await cleanupRace(normalizedRoomCode);
    
  } catch (error) {
    console.error('Error finalizing race:', error);
  }
};

/**
 * Cleans up a race, removing it from memory and clearing bets
 * @param {string} roomCode - The room code
 */
const cleanupRace = async (roomCode) => {
  // Remove from active races
  activeRaces.delete(roomCode);
  
  // Clear bets for the room
  await clearRoomBets(roomCode);
};

// @desc    Get active race status
// @access  Server-only
exports.getRaceStatus = (roomCode) => {
  const race = activeRaces.get(roomCode);
  
  if (!race) {
    return {
      exists: false
    };
  }
  
  return {
    exists: true,
    status: race.finishedAlgorithms.length === Object.keys(race.algorithms).length ? 'finished' : 'racing',
    algorithms: Object.keys(race.algorithms),
    finishedAlgorithms: race.finishedAlgorithms,
    dataset: race.dataset
  };
};

// @desc    Stop a race (for cleanup)
// @access  Server-only
exports.stopRace = async (roomCode) => {
  const race = activeRaces.get(roomCode);
  
  if (race) {
    // Stop all algorithms
    for (const algorithm of Object.values(race.algorithms)) {
      if (algorithm.isRunning) {
        algorithm.pause();
      }
    }
    
    // Clean up race resources
    await cleanupRace(roomCode);
  }
};

// @desc    Update step speed during a race
// @access  Server-only
exports.updateRaceStepSpeed = (io, socket, roomCode, newStepSpeed) => {
  try {
    // Get the active race
    const race = activeRaces.get(roomCode);
    
    if (!race) {
      socket.emit('race_error', { message: 'No active race found' });
      return false;
    }
    
    // Update the race step speed
    race.stepSpeed = newStepSpeed;
    
    // Update the step speed for all algorithms
    for (const algorithm of Object.values(race.algorithms)) {
      algorithm.stepSpeed = newStepSpeed;
    }
    
    // Broadcast the step speed change to all clients
    io.to(roomCode).emit('race_speed_updated', {
      roomCode,
      stepSpeed: newStepSpeed
    });
    
    return true;
  } catch (error) {
    console.error('Error updating race step speed:', error);
    socket.emit('race_error', { message: 'Server error' });
    return false;
  }
};

// @desc    End a race early
// @access  Server-only
exports.endRaceEarly = async (io, socket, roomCode) => {
  try {
    // Normalize room code for consistency
    const normalizedRoomCode = roomCode.trim().toUpperCase();
    
    // Get the active race
    const race = activeRaces.get(normalizedRoomCode);
    
    if (!race) {
      socket.emit('race_error', { message: 'No active race found' });
      return false;
    }
    
    // Check if at least one algorithm has finished
    if (race.finishedAlgorithms.length === 0) {
      socket.emit('race_error', { message: 'Cannot end race early until at least one algorithm has finished' });
      return false;
    }
    
    // Mark the race as ended early so finalizeRace can handle it properly
    race.endedEarly = true;
    
    // Initialize array to track stopped algorithms
    race.stoppedAlgorithms = [];
    
    // Stop all still-running algorithms
    for (const [type, algorithm] of Object.entries(race.algorithms)) {
      // If this algorithm hasn't finished yet
      if (!race.finishedAlgorithms.includes(type) && algorithm.isRunning) {
        algorithm.pause();
        
        // Add it to finished algorithms
        race.finishedAlgorithms.push(type);
        
        // Add to the list of algorithms that were explicitly stopped
        race.stoppedAlgorithms.push(type);
        
        // Notify clients about algorithm being forcibly stopped
        io.to(normalizedRoomCode).emit('algorithm_stopped', {
          type,
          position: race.finishedAlgorithms.length,
          steps: algorithm.currentStep,
          comparisons: algorithm.comparisons,
          swaps: algorithm.swaps,
          arrayAccesses: algorithm.arrayAccesses,
          arrayWrites: algorithm.arrayWrites
        });
      }
    }
    
    // Clear the update interval if it exists
    if (race.updateInterval) {
      clearInterval(race.updateInterval);
    }
    
    // Finalize the race
    await finalizeRace(io, normalizedRoomCode);
    
    // Broadcast that the race was ended early
    io.to(normalizedRoomCode).emit('race_ended_early', {
      roomCode: normalizedRoomCode,
      stoppedBy: socket.username || socket.id,
      stoppedAlgorithms: race.stoppedAlgorithms // Use the dedicated stopped algorithms list
    });
    
    return true;
  } catch (error) {
    console.error('Error ending race early:', error);
    socket.emit('race_error', { message: 'Server error' });
    return false;
  }
};

module.exports = {
  startRace: exports.startRace,
  getRaceStatus: exports.getRaceStatus,
  stopRace: exports.stopRace,
  updateRaceStepSpeed: exports.updateRaceStepSpeed,
  endRaceEarly: exports.endRaceEarly
}; 