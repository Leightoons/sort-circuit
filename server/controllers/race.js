const Room = require('../models/Room');
const User = require('../models/User');
const { createAlgorithm, generateDataset } = require('../utils/algorithmEngine');
const { getAllBetsForRoom, clearRoomBets } = require('./bets');

// In-memory store for active races
const activeRaces = new Map();

// @desc    Start a race
// @access  Server-only
exports.startRace = async (io, socket, roomCode) => {
  try {
    // Find room and update status
    const room = await Room.findOne({ code: roomCode });
    
    if (!room) {
      socket.emit('race_error', { message: 'Room not found' });
      return;
    }
    
    // Check if user is the host
    if (room.host.toString() !== socket.user.id) {
      socket.emit('race_error', { message: 'Only host can start the race' });
      return;
    }
    
    // Check if race is already running
    if (room.status === 'racing') {
      socket.emit('race_error', { message: 'Race is already in progress' });
      return;
    }
    
    // Update room status
    room.status = 'racing';
    await room.save();
    
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
      raceInterval: null
    });
    
    // Broadcast race start to room
    io.to(roomCode).emit('race_started', {
      roomCode,
      algorithms: room.algorithms,
      dataset
    });
    
    // Start the race steps
    const race = activeRaces.get(roomCode);
    race.raceInterval = setInterval(() => {
      executeRaceStep(io, roomCode);
    }, room.stepSpeed);
    
  } catch (error) {
    console.error('Error starting race:', error);
    socket.emit('race_error', { message: 'Server error' });
  }
};

// Execute one step of the race
const executeRaceStep = async (io, roomCode) => {
  const race = activeRaces.get(roomCode);
  
  if (!race) {
    return;
  }
  
  let allFinished = true;
  const updates = {};
  
  // Execute one step for each algorithm
  for (const [type, algorithm] of Object.entries(race.algorithms)) {
    // Skip if already finished
    if (algorithm.finished) {
      continue;
    }
    
    // Execute step
    algorithm.step();
    
    // Get current state
    updates[type] = algorithm.getState();
    
    // Check if just finished
    if (algorithm.finished && !race.finishedAlgorithms.includes(type)) {
      race.finishedAlgorithms.push(type);
      io.to(roomCode).emit('algorithm_finished', {
        type,
        position: race.finishedAlgorithms.length,
        steps: algorithm.currentStep,
        comparisons: algorithm.comparisons,
        swaps: algorithm.swaps
      });
    }
    
    allFinished = allFinished && algorithm.finished;
  }
  
  // Broadcast updates to all clients in the room
  io.to(roomCode).emit('race_update', {
    roomCode,
    updates
  });
  
  // Check if race is complete
  if (allFinished) {
    clearInterval(race.raceInterval);
    await finalizeRace(io, roomCode);
  }
};

// Finalize the race and update scores
const finalizeRace = async (io, roomCode) => {
  try {
    const race = activeRaces.get(roomCode);
    
    if (!race) {
      return;
    }
    
    // Get room
    const room = await Room.findOne({ code: roomCode });
    if (!room) {
      return;
    }
    
    // Update room status
    room.status = 'finished';
    await room.save();
    
    // Get all bets for this room
    const bets = getAllBetsForRoom(roomCode);
    
    // Determine winner algorithm
    const winnerAlgorithm = race.finishedAlgorithms[0];
    
    // Update user points for correct bets
    const winningBets = bets.filter(bet => bet.algorithm === winnerAlgorithm);
    
    for (const bet of winningBets) {
      const user = await User.findById(bet.userId);
      if (user) {
        user.points += 1;
        user.gamesPlayed += 1;
        user.gamesWon += 1;
        await user.save();
      }
    }
    
    // Update played games for losing bets
    const losingBets = bets.filter(bet => bet.algorithm !== winnerAlgorithm);
    
    for (const bet of losingBets) {
      const user = await User.findById(bet.userId);
      if (user) {
        user.gamesPlayed += 1;
        await user.save();
      }
    }
    
    // Get final results with performance metrics
    const results = {};
    for (const [type, algorithm] of Object.entries(race.algorithms)) {
      results[type] = {
        position: race.finishedAlgorithms.indexOf(type) + 1,
        steps: algorithm.currentStep,
        comparisons: algorithm.comparisons,
        swaps: algorithm.swaps,
        isWinner: type === winnerAlgorithm
      };
    }
    
    // Broadcast race results
    io.to(roomCode).emit('race_results', {
      roomCode,
      results,
      winnerAlgorithm,
      winningUsers: winningBets.map(bet => bet.userId)
    });
    
    // Clean up
    activeRaces.delete(roomCode);
    clearRoomBets(roomCode);
    
  } catch (error) {
    console.error('Error finalizing race:', error);
  }
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
  
  if (race && race.raceInterval) {
    clearInterval(race.raceInterval);
    activeRaces.delete(roomCode);
  }
}; 