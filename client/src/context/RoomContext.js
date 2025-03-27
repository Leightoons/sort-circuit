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
    socket.on('room_joined', ({ roomCode }) => {
      setCurrentRoom(roomCode);
      setRoomStatus('waiting');
    });

    // Room error event
    socket.on('room_error', ({ message }) => {
      setError(message);
    });

    // User joined room event
    socket.on('user_joined', (user) => {
      setPlayers((prevPlayers) => [...prevPlayers, user]);
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
      setRaceData({
        dataset,
        progress: {},
        currentStep: 0
      });
      setResults(null);
    });

    // Race update event
    socket.on('race_update', ({ updates }) => {
      setRaceData((prevData) => ({
        ...prevData,
        progress: {
          ...prevData.progress,
          ...updates
        },
        currentStep: Math.max(
          ...Object.values(updates).map((u) => u.currentStep)
        )
      }));
    });

    // Algorithm finished event
    socket.on('algorithm_finished', (data) => {
      // Update race data with finished algorithm
      setRaceData((prevData) => ({
        ...prevData,
        progress: {
          ...prevData.progress,
          [data.type]: {
            ...prevData.progress[data.type],
            finished: true,
            position: data.position
          }
        }
      }));
    });

    // Race results event
    socket.on('race_results', ({ results: raceResults, winnerAlgorithm, winningUsers }) => {
      setRoomStatus('finished');
      setResults({
        results: raceResults,
        winnerAlgorithm,
        winningUsers
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

    // Clean up listeners on unmount
    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('room_error');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('room_players');
      socket.off('algorithms_updated');
      socket.off('settings_updated');
      socket.off('bet_placed');
      socket.off('bet_confirmed');
      socket.off('bet_error');
      socket.off('race_started');
      socket.off('race_update');
      socket.off('algorithm_finished');
      socket.off('race_results');
      socket.off('race_error');
      socket.off('race_status');
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
      setCurrentRoom(null);
      setIsHost(false);
      setPlayers([]);
      setUserBet(null);
      setAllBets([]);
      setResults(null);
      setError(null);
      setRoomStatus('waiting');
      setRaceData(null);
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