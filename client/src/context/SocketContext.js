import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import AuthContext from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { token, isAuthenticated } = useContext(AuthContext);

  // Create and connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      // Create socket instance with token for authentication
      const newSocket = io({
        auth: {
          token
        }
      });

      // Set up event listeners
      newSocket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        setConnected(false);
      });

      // Set socket in state
      setSocket(newSocket);

      // Clean up on unmount
      return () => {
        newSocket.disconnect();
      };
    } else if (socket) {
      // Disconnect if no longer authenticated
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  }, [isAuthenticated, token]);

  // Join a room
  const joinRoom = (roomCode) => {
    if (socket && connected) {
      socket.emit('join_room', { roomCode });
    }
  };

  // Create a room
  const createRoom = (algorithms = ['bubble', 'quick', 'merge']) => {
    if (socket && connected) {
      socket.emit('create_room', { algorithms });
    }
  };

  // Place a bet
  const placeBet = (roomCode, algorithm) => {
    if (socket && connected) {
      socket.emit('place_bet', { roomCode, algorithm });
    }
  };

  // Start a race
  const startRace = (roomCode) => {
    if (socket && connected) {
      socket.emit('start_race', { roomCode });
    }
  };

  // Update room settings
  const updateSettings = (roomCode, settings) => {
    if (socket && connected) {
      socket.emit('update_settings', { roomCode, settings });
    }
  };

  // Select algorithms
  const selectAlgorithms = (roomCode, algorithms) => {
    if (socket && connected) {
      socket.emit('select_algorithm', { roomCode, algorithms });
    }
  };

  // Leave a room
  const leaveRoom = (roomCode) => {
    if (socket && connected) {
      socket.emit('leave_room', { roomCode });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        joinRoom,
        createRoom,
        placeBet,
        startRace,
        updateSettings,
        selectAlgorithms,
        leaveRoom
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext; 