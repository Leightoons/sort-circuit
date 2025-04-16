const { getModel } = require('../config/db');
const { createAlgorithm, generateDataset } = require('../utils/algorithmEngine');
const { getAllBetsForRoom, clearRoomBets } = require('./bets');

// In-memory store for active races
const activeRaces = new Map();

// In-memory store for bets
const bets = new Map();

// @desc    Start a race
// @access  Server-only
exports.startRace = async (io, socket, roomCode, room) => {
  try {
    if (!room) {
      // Find room if not provided
      const Room = getModel('Room');
      room = await Room.findOne({ code: roomCode });
      
      if (!room) {
        socket.emit('race_error', { message: 'Room not found' });
        return;
      }
    }
    
    // Check if race is already running
    if (activeRaces.has(roomCode)) {
      socket.emit('race_error', { message: 'Race is already in progress' });
      return;
    }
    
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
    
    // Store race data
    activeRaces.set(roomCode, {
      roomCode,
      algorithms,
      dataset,
      startTime: Date.now(),
      stepSpeed: room.stepSpeed,
      finishedAlgorithms: [],
      bets: getBetsForRoom(roomCode)
    });
    
    // Broadcast race start to room
    io.to(roomCode).emit('race_started', {
      roomCode,
      algorithms: room.algorithms,
      dataset
    });
    
    // Start all the sorting algorithms asynchronously
    const race = activeRaces.get(roomCode);
    
    // Start the algorithms and set up regular update broadcasts
    await runRaceAlgorithms(io, roomCode, race);
    
  } catch (error) {
    console.error('Error starting race:', error);
    socket.emit('race_error', { message: 'Server error' });
  }
};

// Run all the algorithms and broadcast updates
const runRaceAlgorithms = async (io, roomCode, race) => {
  try {
    // Set up a regular interval to broadcast the current state
    const updateInterval = setInterval(() => {
      broadcastRaceUpdate(io, roomCode, race);
    }, Math.min(0, race.stepSpeed));
    
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
        io.to(roomCode).emit('algorithm_finished', {
          type,
          position,
          steps: algorithm.currentStep,
          comparisons: algorithm.comparisons,
          swaps: algorithm.swaps
        });
        
        // Check if all algorithms are done
        if (race.finishedAlgorithms.length === Object.keys(race.algorithms).length) {
          if (race.updateInterval) {
            clearInterval(race.updateInterval);
          }
          await finalizeRace(io, roomCode);
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
  const updates = {};
  
  // Get current state of each algorithm
  for (const [type, algorithm] of Object.entries(race.algorithms)) {
    updates[type] = algorithm.getState();
  }
  
  // Broadcast updates to all clients in the room
  io.to(roomCode).emit('race_update', {
    roomCode,
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
    isWinner: type === winnerAlgorithm,
    stoppedEarly: wasStoppedEarly
  };
};

// Finalize the race and update scores
const finalizeRace = async (io, roomCode) => {
  try {
    const race = activeRaces.get(roomCode);
    
    if (!race) {
      return;
    }
    
    // Get room
    const Room = getModel('Room');
    const room = await Room.findOne({ code: roomCode });
    if (!room) {
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
    
    for (const [betKey, bet] of bets.entries()) {
      if (bet.roomCode === roomCode) {
        if (bet.algorithm === winnerAlgorithm) {
          winningBets.push(bet);
          winningUsers.push(bet.socketId);
        }
      }
    }
    
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
    io.to(roomCode).emit('race_results', {
      roomCode,
      results,
      winnerAlgorithm,
      winningUsers,
      endedEarly: race.endedEarly || false
    });
    
    // Clean up
    cleanupRace(roomCode);
    
  } catch (error) {
    console.error('Error finalizing race:', error);
  }
};

/**
 * Cleans up a race, removing it from memory and clearing bets
 * @param {string} roomCode - The room code
 */
const cleanupRace = (roomCode) => {
  // Remove from active races
  activeRaces.delete(roomCode);
  
  // Clear bets for the room
  clearRoomBets(roomCode);
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
exports.stopRace = (roomCode) => {
  const race = activeRaces.get(roomCode);
  
  if (race) {
    // Stop all algorithms
    for (const algorithm of Object.values(race.algorithms)) {
      if (algorithm.isRunning) {
        algorithm.pause();
      }
    }
    
    // Clean up race resources
    cleanupRace(roomCode);
  }
};

// @desc    Place a bet
// @access  Server-only
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

// @desc    Get all bets for a room
// @access  Server-only
const getBetsForRoom = (roomCode) => {
  const roomBets = [];
  
  for (const [key, bet] of bets.entries()) {
    if (bet.roomCode === roomCode) {
      roomBets.push(bet);
    }
  }
  
  return roomBets;
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
    // Get the active race
    const race = activeRaces.get(roomCode);
    
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
        io.to(roomCode).emit('algorithm_stopped', {
          type,
          position: race.finishedAlgorithms.length,
          steps: algorithm.currentStep,
          comparisons: algorithm.comparisons,
          swaps: algorithm.swaps
        });
      }
    }
    
    // Clear the update interval if it exists
    if (race.updateInterval) {
      clearInterval(race.updateInterval);
    }
    
    // Finalize the race
    await finalizeRace(io, roomCode);
    
    // Broadcast that the race was ended early
    io.to(roomCode).emit('race_ended_early', {
      roomCode,
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
  placeBet: exports.placeBet,
  updateRaceStepSpeed: exports.updateRaceStepSpeed,
  endRaceEarly: exports.endRaceEarly,
  getBetsForRoom
}; 