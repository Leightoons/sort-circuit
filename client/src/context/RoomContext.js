import { createContext, useState, useContext, useEffect } from 'react';
import SocketContext from './SocketContext';

const RoomContext = createContext();

export const RoomProvider = ({ children }) => {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [algorithms, setAlgorithms] = useState([]);
  const [settings, setSettings] = useState({
    datasetSize: 20,
    allowDuplicates: false,
    valueRange: { min: 1, max: 100 },
    stepSpeed: 500
  });
  const [roomStatus, setRoomStatus] = useState('waiting'); // waiting, racing, finished
  const [raceData, setRaceData] = useState(null);
  const [userBet, setUserBet] = useState(null);
  const [allBets, setAllBets] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const { socket, connected, username } = useContext(SocketContext);

  // Listen for socket events related to rooms
  useEffect(() => {
    if (!socket || !connected) return;

    // Room created event
    socket.on('room_created', ({ roomCode, isHost: isRoomHost }) => {
      setCurrentRoom(roomCode);
      setIsHost(isRoomHost);
      setRoomStatus('waiting');
      // Reset other states
      setPlayers([]);
      setUserBet(null);
      setAllBets([]);
      setResults(null);
      setError(null);
    });

    // Room joined event
    socket.on('room_joined', ({ roomCode, isHost: isRoomHost }) => {
      setCurrentRoom(roomCode);
      setRoomStatus('waiting');
      console.log('Room joined, isHost:', isRoomHost);
      if (isRoomHost) {
        setIsHost(true);
        console.log('Setting user as host');
      } else {
        setIsHost(false);
        console.log('User is not the host');
      }
      setError(null);
    });

    // Room error event
    socket.on('room_error', ({ message }) => {
      setError(message);
    });

    // User left room event
    socket.on('user_left', (user) => {
      setPlayers((prevPlayers) => 
        prevPlayers.filter((p) => p.socketId !== user.socketId)
      );
    });

    // Room players event
    socket.on('room_players', ({ players: roomPlayers }) => {
      setPlayers(roomPlayers);
      
      // If we're in a room, check if we're the host based on the players list
      if (socket) {
        const currentPlayerData = roomPlayers.find(p => p.socketId === socket.id);
        if (currentPlayerData && currentPlayerData.isHost) {
          console.log('User confirmed as host via players list');
          setIsHost(true);
        }
      }
    });

    // Algorithms updated event
    socket.on('algorithms_updated', ({ algorithms: updatedAlgorithms }) => {
      setAlgorithms(updatedAlgorithms);
    });

    // Settings updated event
    socket.on('settings_updated', ({ settings: updatedSettings }) => {
      setSettings(updatedSettings);
    });

    // Bet placed event
    socket.on('bet_placed', (bet) => {
      setAllBets((prevBets) => [...prevBets, bet]);
    });

    // Bet confirmed event
    socket.on('bet_confirmed', ({ algorithm }) => {
      setUserBet(algorithm);
    });

    // Bet error event
    socket.on('bet_error', ({ message }) => {
      setError(message);
    });

    // Race started event
    socket.on('race_started', ({ dataset }) => {
      setRoomStatus('racing');
      
      // Completely reset race data to ensure no leftover state from previous races
      // This prevents visualization jitter when starting a new race after ending one early
      setRaceData({
        dataset: [...dataset], // Use a new array reference to force re-rendering
        progress: {},
        currentStep: 0,
        endedEarly: false // Reset the ended early flag
      });
      
      setResults(null);
    });

    // Race update event
    socket.on('race_update', ({ updates }) => {
      setRaceData((prevData) => {
        // Create a new progress object starting with previous data
        const newProgress = { ...prevData.progress };
        
        // For all algorithms that are not in the current update, clear their lastOperation
        Object.keys(newProgress).forEach(algo => {
          if (!updates[algo] && newProgress[algo]) {
            console.log(`Clearing highlight for ${algo}`);
            newProgress[algo] = {
              ...newProgress[algo],
              lastOperation: null // Clear the highlighting
            };
          }
        });
        
        // Process each algorithm update with special handling for repeated operation types
        const processedUpdates = {};
        
        Object.entries(updates).forEach(([algo, update]) => {
          const currentAlgo = newProgress[algo] || {};
          const currentOperation = currentAlgo.lastOperation;
          const newOperation = update.lastOperation;
          
          // If there's a new operation for this algorithm
          if (newOperation) {
            // Check if it's the same type as the previous operation
            const isSameOperationType = 
              currentOperation && 
              newOperation.type === currentOperation.type &&
              JSON.stringify(newOperation.indices) !== JSON.stringify(currentOperation.indices);
            
            // If same operation type but different indices, add alternating flag
            if (isSameOperationType) {
              console.log(`${algo}: Same operation type (${newOperation.type}), alternating highlight`);
              
              // Toggle the alternating flag or set it if it doesn't exist
              const alternateFlag = currentOperation.alternate ? !currentOperation.alternate : true;
              
              processedUpdates[algo] = {
                ...update,
                lastOperation: {
                  ...newOperation,
                  alternate: alternateFlag
                }
              };
            } else {
              // Different operation type, reset the alternating flag
              console.log(`${algo}: New operation type (${newOperation.type})`);
              processedUpdates[algo] = {
                ...update,
                lastOperation: {
                  ...newOperation,
                  alternate: false
                }
              };
            }
          } else {
            // No operation, just pass through the update
            processedUpdates[algo] = update;
          }
        });
        
        // Now add the processed updates
        return {
          ...prevData,
          progress: {
            ...newProgress,
            ...processedUpdates
          },
          currentStep: Math.max(
            ...Object.values(updates).map(u => u.currentStep),
            prevData.currentStep || 0
          )
        };
      });
    });

    // Algorithm finished event
    socket.on('algorithm_finished', ({ type, position, steps, comparisons, swaps }) => {
      setRaceData((prevData) => {
        if (!prevData || !prevData.progress || !prevData.progress[type]) return prevData;
        
        const newProgress = { ...prevData.progress };
        newProgress[type] = {
          ...newProgress[type],
          position,
          steps,
          comparisons,
          swaps,
          finished: true
        };
        
        return { ...prevData, progress: newProgress };
      });
    });

    // Algorithm stopped event (when a race is ended early)
    socket.on('algorithm_stopped', ({ type, position, steps, comparisons, swaps }) => {
      setRaceData((prevData) => {
        if (!prevData || !prevData.progress || !prevData.progress[type]) return prevData;
        
        const newProgress = { ...prevData.progress };
        newProgress[type] = {
          ...newProgress[type],
          position,
          steps,
          comparisons,
          swaps,
          finished: true,
          stoppedEarly: true // Mark as stopped early
        };
        
        return { ...prevData, progress: newProgress };
      });
    });

    // Race ended early event
    socket.on('race_ended_early', ({ stoppedBy, stoppedAlgorithms }) => {
      console.log(`Race ended early by ${stoppedBy}, stopping algorithms:`, stoppedAlgorithms);
      
      // We need to ensure the raceData state is properly prepared for the next race
      // to prevent visualization jitter problems
      setRaceData(prevData => {
        if (!prevData) return prevData;
        
        // Create a clean dataset reference that won't cause visualization jitter
        const cleanDataset = [...prevData.dataset];
        
        // Return progress data with properly reset state for next race
        return {
          ...prevData,
          dataset: cleanDataset,
          // Keep the progress data for showing results
          currentStep: prevData.currentStep,
          endedEarly: true // Mark that this race was ended early
        };
      });
    });

    // Race results event
    socket.on('race_results', ({ results: raceResults, winnerAlgorithm }) => {
      setRoomStatus('finished');
      setResults({
        winnerAlgorithm,
        results: raceResults
      });
    });

    // Race error event
    socket.on('race_error', ({ message }) => {
      setError(message);
    });

    // Race status event
    socket.on('race_status', (status) => {
      setRoomStatus(status.status);
      setAlgorithms(status.algorithms);
      if (status.dataset) {
        setRaceData({
          dataset: status.dataset,
          progress: {},
          currentStep: 0
        });
      }
    });

    // Host assigned event
    socket.on('host_assigned', ({ roomCode }) => {
      console.log('User has been assigned as host for room:', roomCode);
      setIsHost(true);
    });

    // Host changed event
    socket.on('host_changed', ({ socketId, username }) => {
      console.log('Host changed to:', username, socketId);
      console.log('Current socket ID:', socket.id);
      
      // Update host status if this user is the new host
      if (socketId === socket.id) {
        console.log('This user is now the host');
        setIsHost(true);
      } else {
        // If someone else became host, make sure we're not host anymore
        console.log('Another user is now the host');
        setIsHost(false);
      }
      
      // Update players list with new host information
      setPlayers(currentPlayers => 
        currentPlayers.map(player => ({
          ...player,
          isHost: player.socketId === socketId
        }))
      );
    });

    // Bets reset event
    socket.on('bets_reset', () => {
      setUserBet(null);
      setAllBets([]);
    });

    // Room state reset event
    socket.on('room_state_reset', ({ roomCode }) => {
      console.log(`Room ${roomCode} state has been reset`);
      setRoomStatus('waiting');
      setResults(null);
      
      // Fully reset race data to prevent visualization issues in the next race
      setRaceData(null);
    });

    // Clean up listeners on unmount
    return () => {
      // Clean up all socket event listeners
      if (socket) {
        socket.off('room_created');
        socket.off('room_joined');
        socket.off('room_error');
        socket.off('user_left');
        socket.off('room_players');
        socket.off('algorithms_updated');
        socket.off('settings_updated');
        socket.off('race_start');
        socket.off('race_update');
        socket.off('race_results');
        socket.off('algorithm_finished');
        socket.off('algorithm_stopped');
        socket.off('race_ended_early');
        socket.off('bet_placed');
        socket.off('bet_confirmed');
        socket.off('race_error');
        socket.off('race_status');
        socket.off('host_assigned');
        socket.off('host_changed');
        socket.off('bets_reset');
        socket.off('room_state_reset');
      }
    };
  }, [socket, connected]);

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Leave current room
  const leaveCurrentRoom = () => {
    if (currentRoom && socket && connected) {
      socket.emit('leave_room', { roomCode: currentRoom });
      
      // Reset all room-related state
      setCurrentRoom(null);
      setIsHost(false);
      setPlayers([]);
      setUserBet(null);
      setAllBets([]);
      setResults(null);
      setError(null);
      setRoomStatus('waiting');
      setRaceData(null);
      
      // Also call SocketContext's leaveCurrentRoom to update host status
      if (socket.leaveCurrentRoom) {
        socket.leaveCurrentRoom();
      }
    }
  };

  return (
    <RoomContext.Provider
      value={{
        currentRoom,
        isHost,
        players,
        algorithms,
        settings,
        roomStatus,
        raceData,
        userBet,
        allBets,
        results,
        error,
        currentUsername: username,
        clearError,
        leaveCurrentRoom
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export default RoomContext; 