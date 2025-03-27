import { createContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  // Create and connect socket when component mounts
  useEffect(() => {
    // Create socket instance with username for authentication
    const newSocket = io({
      auth: {
        username: localStorage.getItem('username') || ''
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
  }, []);

  // Setup heartbeat to keep connection alive
  useEffect(() => {
    if (!socket || !connected) return;

    // Send heartbeat every 10 seconds
    const heartbeatInterval = setInterval(() => {
      socket.emit('heartbeat');
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [socket, connected]);

  // Update socket auth when username changes
  useEffect(() => {
    if (socket) {
      socket.auth = { username };
      // If already connected, no need to reconnect
      if (!connected) {
        socket.connect();
      }
    }
  }, [username, socket, connected]);

  // Set username in storage
  const setUsernameFn = (name) => {
    setUsername(name);
    localStorage.setItem('username', name);
  };

  // Join a room
  const joinRoom = (roomCode, playerName) => {
    if (socket && connected) {
      const name = playerName || username;
      if (name) {
        setUsernameFn(name);
        socket.emit('join_room', { roomCode, username: name });
      }
    }
  };

  // Create a room
  const createRoom = (algorithms = ['bubble', 'quick', 'merge'], playerName) => {
    if (socket && connected) {
      const name = playerName || username;
      if (name) {
        setUsernameFn(name);
        socket.emit('create_room', { algorithms, username: name });
      }
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
        username,
        setUsername: setUsernameFn,
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