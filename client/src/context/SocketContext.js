import { createContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const heartbeatIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // Heartbeat configuration - should match server
  const HEARTBEAT_INTERVAL = 15000; // 15 seconds

  // Create and connect socket when component mounts
  useEffect(() => {
    // Create socket instance with username for authentication
    const newSocket = io({
      auth: {
        username: localStorage.getItem('username') || ''
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    // Set up event listeners
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      
      // Clear any reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      setConnected(false);
      
      // If the server closed the connection, try to reconnect manually
      if (reason === 'io server disconnect') {
        // The disconnection was initiated by the server, reconnect manually
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          newSocket.connect();
        }, 3000);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setConnected(false);
    });

    // Set socket in state
    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      newSocket.disconnect();
    };
  }, []);

  // Setup heartbeat to keep connection alive
  useEffect(() => {
    // Clear any existing heartbeat interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (!socket || !connected) return;

    // Send initial heartbeat immediately
    socket.emit('heartbeat');
    console.log('Sending initial heartbeat');
    
    // Send heartbeat every HEARTBEAT_INTERVAL
    heartbeatIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
        console.log('Sending heartbeat');
      } else {
        console.log('Socket not connected, skipping heartbeat');
      }
    }, HEARTBEAT_INTERVAL);

    // Clear interval on cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
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